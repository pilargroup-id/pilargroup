<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
                'entityId' => 'http://pilargroup.id/saml/metadata',
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
                'entityId' => env('APP_SAML_SP_ENTITY_ID', 'https://assetit.pilargroup.id'),
                'assertionConsumerService' => [
                    'url'     => env('APP_SAML_ACS_URL', 'https://assetit.pilargroup.id/saml/acs'),
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                ],
                'singleLogoutService' => [
                    'url'     => env('APP_SAML_SLO_URL', 'https://assetit.pilargroup.id/saml/slo'),
                    'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                ],
                'NameIDFormat' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
            ],
        ];
    }

    // GET /saml/metadata
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

    // GET|POST /saml/sso
    public function sso(Request $request)
    {
        if (!$request->has('SAMLRequest')) {
            return redirect('/');
        }

        $samlRequest = $request->get('SAMLRequest');
        $relayState  = $request->get('RelayState', '');

        // Decode ACS URL dari SAMLRequest
        try {
            $decoded = base64_decode($samlRequest);
            // Coba gzinflate dulu, kalau gagal pakai raw decoded
            $xml = @gzinflate($decoded);
            if ($xml === false) {
                $xml = $decoded;
            }
            $xmlObj = simplexml_load_string($xml);
            $acsUrl = (string) ($xmlObj->attributes()['AssertionConsumerServiceURL'] ?? '');
        } catch (\Exception $e) {
            $acsUrl = '';
        }

        // Force HTTPS protocol for production (handle Cloudflare redirect)
        if (!empty($acsUrl) && strpos($acsUrl, 'http://') === 0) {
            $acsUrl = str_replace('http://', 'https://', $acsUrl);
        }

        // Fallback ACS URL
        if (empty($acsUrl)) {
            $acsUrl = env('APP_SAML_ACS_URL', 'https://assetit.pilargroup.id/saml/acs');
        }

        // Simpan ke DB
        $samlToken = Str::uuid()->toString();
        DB::table('saml_pending_requests')->insert([
            'id'           => $samlToken,
            'saml_request' => $samlRequest,
            'relay_state'  => $relayState,
            'acs_url'      => $acsUrl,
            'created_at'   => now(),
        ]);

        // Redirect ke frontend login dengan saml_token
        return redirect("https://pilargroup.id/login?saml_token={$samlToken}");
    }

    // Dipanggil dari /api/saml/respond (setelah user login)
    public function sendResponse(string $userId, string $samlToken)
    {
        $pending = DB::table('saml_pending_requests')
            ->where('id', $samlToken)
            ->first();

        if (!$pending) {
            abort(400, 'Invalid or expired SAML token');
        }

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->where('is_active', 1)
            ->first();

        if (!$user) {
            abort(403, 'User not found or inactive');
        }

        DB::table('saml_pending_requests')->where('id', $samlToken)->delete();

        // Sync user ke Snipe-IT dulu sebelum kirim SAML response
        (new \App\Services\SnipeItService())->syncUser($user);

        $certContent = file_get_contents(storage_path('app/saml/saml.crt'));
        $keyContent  = file_get_contents(storage_path('app/saml/saml.key'));

        $acsUrl     = $pending->acs_url;
        $relayState = $pending->relay_state ?? '';

        $now          = gmdate('Y-m-d\TH:i:s\Z');
        $notOnOrAfter = gmdate('Y-m-d\TH:i:s\Z', strtotime('+1 hour'));
        $responseId   = '_' . bin2hex(random_bytes(16));
        $assertionId  = '_' . bin2hex(random_bytes(16));
        $issuer       = $this->getSamlSettings()['idp']['entityId'];
        $spEntityId   = env('APP_SAML_SP_ENTITY_ID', 'https://assetit.pilargroup.id');

        $nameParts = explode(' ', trim($user->name));
        $firstName = $nameParts[0];
        $lastName  = implode(' ', array_slice($nameParts, 1)) ?: $nameParts[0];

        $assertionXml = <<<XML
    <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="{$assertionId}" Version="2.0" IssueInstant="{$now}">
        <saml:Issuer>{$issuer}</saml:Issuer>
        <saml:Subject>
            <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">{$user->username}</saml:NameID>
            <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
                <saml:SubjectConfirmationData NotOnOrAfter="{$notOnOrAfter}" Recipient="{$acsUrl}"/>
            </saml:SubjectConfirmation>
        </saml:Subject>
        <saml:Conditions NotBefore="{$now}" NotOnOrAfter="{$notOnOrAfter}">
            <saml:AudienceRestriction>
                <saml:Audience>{$spEntityId}</saml:Audience>
            </saml:AudienceRestriction>
        </saml:Conditions>
        <saml:AuthnStatement AuthnInstant="{$now}" SessionIndex="{$assertionId}">
            <saml:AuthnContext>
                <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef>
            </saml:AuthnContext>
        </saml:AuthnStatement>
        <saml:AttributeStatement>
            <saml:Attribute Name="username">
                <saml:AttributeValue>{$user->username}</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="email">
                <saml:AttributeValue>{$user->email}</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="first_name">
                <saml:AttributeValue>{$firstName}</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="last_name">
                <saml:AttributeValue>{$lastName}</saml:AttributeValue>
            </saml:Attribute>
        </saml:AttributeStatement>
    </saml:Assertion>
    XML;

        $signedAssertion = $this->signXml($assertionXml, $keyContent, $certContent);

        $samlResponse = <<<XML
    <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        ID="{$responseId}" Version="2.0" IssueInstant="{$now}"
        Destination="{$acsUrl}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">{$issuer}</saml:Issuer>
        <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>
        {$signedAssertion}
    </samlp:Response>
    XML;

        \Log::info('ACS URL used: ' . $acsUrl);

        $encodedResponse = base64_encode($samlResponse);

        return view('saml.response', [
            'acs_url'       => $acsUrl,
            'saml_response' => $encodedResponse,
            'relay_state'   => $relayState,
        ]);
    }

    // Sign XML dengan private key (XMLDSig)
    private function signXml(string $xml, string $privateKeyPem, string $certPem): string
    {
        $doc = new \DOMDocument();
        $doc->preserveWhiteSpace = false;
        $doc->loadXML(trim($xml));

        $id   = $doc->documentElement->getAttribute('ID');
        $c14n = $doc->documentElement->C14N(true, false);
        $digest = base64_encode(hash('sha256', $c14n, true));

        $signedInfoXml = '<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
            . '<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>'
            . '<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>'
            . '<ds:Reference URI="#' . $id . '">'
            . '<ds:Transforms>'
            . '<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>'
            . '<ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>'
            . '</ds:Transforms>'
            . '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>'
            . '<ds:DigestValue>' . $digest . '</ds:DigestValue>'
            . '</ds:Reference>'
            . '</ds:SignedInfo>';

        $siDoc = new \DOMDocument();
        $siDoc->loadXML($signedInfoXml);
        $c14nSI = $siDoc->documentElement->C14N(true, false);

        openssl_sign($c14nSI, $sigBytes, openssl_pkey_get_private($privateKeyPem), OPENSSL_ALGO_SHA256);
        $sigValue = base64_encode($sigBytes);

        $cert = preg_replace('/-----.*?-----|\s/', '', $certPem);

        $sigDoc = new \DOMDocument();
        $sigDoc->loadXML(
            '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
            . $signedInfoXml
            . '<ds:SignatureValue>' . $sigValue . '</ds:SignatureValue>'
            . '<ds:KeyInfo><ds:X509Data><ds:X509Certificate>' . $cert . '</ds:X509Certificate></ds:X509Data></ds:KeyInfo>'
            . '</ds:Signature>'
        );

        $importedSig = $doc->importNode($sigDoc->documentElement, true);

        $issuerList = $doc->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer');
        if ($issuerList->length > 0) {
            $issuerNode = $issuerList->item(0);
            $issuerNode->parentNode->insertBefore($importedSig, $issuerNode->nextSibling);
        } else {
            $doc->documentElement->appendChild($importedSig);
        }

        return $doc->saveXML($doc->documentElement);
    }

    // GET /saml/slo
    public function slo()
    {
        session()->forget(['saml_request', 'saml_relay_state', 'saml_acs_url']);
        return redirect('/login');
    }
}