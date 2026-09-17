import apiClient from '@/api/client';

export const nonprofitsService = {
  getOrganizationDetailsByEIN: (ein: string) =>
    apiClient.get('/nonprofits/getOrganizationDetailsByEIN', { params: { ein } }),
};
