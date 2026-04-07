<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OneLogin\Saml2\Auth as SamlAuth;
use OneLogin\Saml2\Utils as SamlUtils;

class SamlController extends Controller
{
    private function getSamlSettings(): array
    {
        $certContent = file_get_contents(storage_path('app/saml/saml.crt'));
        $cert = preg_replace('/-----.*?-----|\s/', '', $certContent);

        return [
            'strict' => false,
            'debug'  => env('APP_DEBUG', false),

            'idp' => [
                'entityId'    => 'https://pilargroup.id/saml/metadata',
                'singleSignOnService' => [
                    'url'     => 'https://pilargroup.id/saml/sso',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'singleLogoutService' => [
                    'url'     => 'https://pilargroup.id/saml/slo',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'x509cert' => $cert,
            ],

            'sp' => [
                'entityId'   => 'https://assetit.pilargroup.id',
                'assertionConsumerService' => [
                    'url'     => 'https://assetit.pilargroup.id/saml/acs',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                ],
                'singleLogoutService' => [
                    'url'     => 'https://assetit.pilargroup.id/saml/slo',
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'NameIDFormat' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
            ],
        ];
    }

    // GET /saml/metadata → XML metadata untuk diisi ke Snipe-IT
    public function metadata()
    {
        $certPath = storage_path('app/saml/saml.crt');

        if (!file_exists($certPath)) {
            return response()->json(['message' => 'Certificate not found'], 500);
        }

        $certContent = file_get_contents($certPath);
        $cert = preg_replace('/-----.*?-----|\s/', '', $certContent);

        $idpMetadata = '<?xml version="1.0"?>
    <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
        entityID="' . url('/saml/metadata') . '">
        <md:IDPSSODescriptor WantAuthnRequestsSigned="false"
            protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <md:KeyDescriptor use="signing">
                <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                    <ds:X509Data>
                        <ds:X509Certificate>' . $cert . '</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </md:KeyDescriptor>
            <md:KeyDescriptor use="encryption">
                <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                    <ds:X509Data>
                        <ds:X509Certificate>' . $cert . '</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </md:KeyDescriptor>
            <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                Location="' . url('/saml/slo') . '"/>
            <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat>
            <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                Location="' . url('/saml/sso') . '"/>
            <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                Location="' . url('/saml/sso') . '"/>
        </md:IDPSSODescriptor>
    </md:EntityDescriptor>';

        return response($idpMetadata, 200)->header('Content-Type', 'application/xml');
    }

    // GET /saml/sso → handle login request dari Snipe-IT
    public function sso(Request $request)
    {
        if (!$request->has('SAMLRequest')) {
            return redirect('/');
        }

        $saml = new SamlAuth($this->getSamlSettings());

        // Parse SAMLRequest untuk ambil ACS URL
        $samlRequest = $request->get('SAMLRequest');
        $relayState  = $request->get('RelayState', '');

        // Decode SAMLRequest untuk ambil ACS URL
        $decodedRequest = gzinflate(base64_decode($samlRequest));
        $xml = simplexml_load_string($decodedRequest);
        $acsUrl = (string) $xml->attributes()['AssertionConsumerServiceURL'] ?? 'https://aset-it.pilargroup.id/saml/acs';

        // Simpan ke session
        session([
            'saml_request'     => $samlRequest,
            'saml_relay_state' => $relayState,
            'saml_acs_url'     => $acsUrl,
        ]);

        // Redirect ke halaman login pilargroup
        return redirect('/login?saml=1');
    }

    // POST /saml/response → dipanggil setelah user berhasil login di pilargroup
    public function sendResponse(string $userId, string $relayState = '')
    {
        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->where('is_active', 1)
            ->first();

        if (!$user) {
            abort(403, 'User not found');
        }

        $keyContent  = file_get_contents(storage_path('app/saml/saml.key'));
        $certContent = file_get_contents(storage_path('app/saml/saml.crt'));
        $cert = preg_replace('/-----.*?-----|\s/', '', $certContent);
        $key  = preg_replace('/-----.*?-----|\s/', '', $keyContent);

        // Build SAML Response
        $now        = gmdate('Y-m-d\TH:i:s\Z');
        $notOnOrAfter = gmdate('Y-m-d\TH:i:s\Z', strtotime('+1 hour'));
        $responseId = '_' . bin2hex(random_bytes(16));
        $assertionId = '_' . bin2hex(random_bytes(16));

        $acsUrl = session('saml_acs_url', '');

        $samlResponse = <<<XML
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
            ID="{$responseId}" Version="2.0" IssueInstant="{$now}"
            Destination="{$acsUrl}">
            <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
                {$this->getSamlSettings()['idp']['entityId']}
            </saml:Issuer>
            <samlp:Status>
                <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
            </samlp:Status>
            <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="{$assertionId}" Version="2.0" IssueInstant="{$now}">
                <saml:Issuer>{$this->getSamlSettings()['idp']['entityId']}</saml:Issuer>
                <saml:Subject>
                    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">
                        {$user->username}
                    </saml:NameID>
                    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
                        <saml:SubjectConfirmationData NotOnOrAfter="{$notOnOrAfter}"
                            Recipient="{$acsUrl}"/>
                    </saml:SubjectConfirmation>
                </saml:Subject>
                <saml:AttributeStatement>
                    <saml:Attribute Name="username">
                        <saml:AttributeValue>{$user->username}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="email">
                        <saml:AttributeValue>{$user->email}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="name">
                        <saml:AttributeValue>{$user->name}</saml:AttributeValue>
                    </saml:Attribute>
                </saml:AttributeStatement>
            </saml:Assertion>
        </samlp:Response>
        XML;

        $encodedResponse = base64_encode($samlResponse);

        // Auto-submit form ke Snipe-IT ACS URL
        return view('saml.response', [
            'acs_url'        => $acsUrl,
            'saml_response'  => $encodedResponse,
            'relay_state'    => $relayState,
        ]);
    }

    // GET /saml/slo → handle logout
    public function slo()
    {
        session()->forget(['saml_request', 'saml_relay_state', 'saml_acs_url']);
        return redirect('/login');
    }
}