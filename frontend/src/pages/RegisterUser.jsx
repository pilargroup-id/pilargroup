import { useState } from 'react';
import { ArrowNarrowRight } from '@untitledui/icons';

import AppLayout from '@/layouts/AppLayout';
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs';
import { usePageTitle } from '@/hooks/usePageTitle';
import '@/assets/styles/register.css';

const usersRegistered = {

}

function RegisterUser(name) {
    return name
        .split('')
        .filter(boolean)
        .slice('')
        .join('')
}

function RegisterUserPage() {
    usePageTitle()

    const [searchQuery, setSarchQuery] = useState('')

    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const filteredUsers = usersRegistered.filter(({name}) => {
        if (!normalizedSearchQuery) {
            return true
        }

        return [name].some((field) =>
            field.toLowerCase().includes(normalizedSearchQuery)
        )
    })
}