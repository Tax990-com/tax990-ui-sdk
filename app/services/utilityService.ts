import apiClient from '@/api/client';

export const utilityService = {
  ping: () => apiClient.get('/utility/ping'),

  getAllSubmissionIds: () => apiClient.get('/utility/getAllSubmissionId'),

  getSubmissionIdByBusinessId: (businessId: string) =>
    apiClient.get('/utility/getSubmissionIdByBusinessId', { params: { businessId } }),

  getSubmissionIdByRecordId: (recordId: string) =>
    apiClient.get('/utility/getSubmissionIdByRecordId', { params: { recordId } }),

  getRecordIds: () => apiClient.get('/utility/getRecordIds'),

  getRecordIdBySubmissionId: (submissionId: string) =>
    apiClient.get('/utility/getRecordIdBySubmissionId', { params: { submissionId } }),

  getRecordDetailBySubmissionId: (submissionId: string) =>
    apiClient.get('/utility/getRecordDetailBySubmissionId', { params: { submissionId } }),

  getAllBusinessIds: () => apiClient.get('/utility/getAllBusinessId'),

  getBusinessIdBySubmissionId: (submissionId: string) =>
    apiClient.get('/utility/getBusinessIdBySubmissionId', { params: { submissionId } }),
};
