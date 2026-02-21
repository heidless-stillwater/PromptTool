'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { ModalStatus } from '@/components/StatusModal';

export function useAdminSettings() {
    const { showToast } = useToast();
    const [announcement, setAnnouncement] = useState('Welcome to the new AI Image Studio!');
    const [isSaving, setIsSaving] = useState(false);
    const [model, setModel] = useState('flash');
    const [safety, setSafety] = useState('medium');
    const [modalStatus, setModalStatus] = useState<ModalStatus>('idle');

    const handleSave = async () => {
        if (isSaving) return;

        // Validation: Announcement checks
        if (!announcement.trim()) {
            showToast('Announcement cannot be empty', 'error');
            return;
        }

        if (announcement.length > 250) {
            showToast('Announcement is too long (max 250 chars)', 'error');
            return;
        }

        // Validation: Model checks
        const validModels = ['flash', 'pro'];
        if (!validModels.includes(model)) {
            showToast('Invalid model selected', 'error');
            return;
        }

        setIsSaving(true);
        setModalStatus('saving');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSaving(false);
        setModalStatus('success');
    };

    return {
        announcement,
        setAnnouncement,
        isSaving,
        model,
        setModel,
        safety,
        setSafety,
        modalStatus,
        setModalStatus,
        handleSave
    };
}
