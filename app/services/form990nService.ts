import apiClient from '@/api/client';
import type { CreateRequest, UpdateRequest, TransmitRequest } from '@/types';

export const form990nService = {
  create: (data: CreateRequest, idempotencyKey?: string) =>
    apiClient.post('/form990n/create', data, {
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
    }),

  update: (data: UpdateRequest) =>
    apiClient.post('/form990n/update', data),

  get: (submissionId: string, recordId?: string) => {
    const params: Record<string, string> = { SubmissionId: submissionId };
    if (recordId) params.RecordId = recordId;
    return apiClient.get('/form990n/get', { params });
  },

  list: (submissionId?: string, businessId?: string) => {
    const params: Record<string, string> = {};
    if (submissionId) params.SubmissionId = submissionId;
    if (businessId) params.BusinessId = businessId;
    return apiClient.get('/form990n/list', { params });
  },

  delete: (submissionId: string, recordId?: string) => {
    const params: Record<string, string> = { SubmissionId: submissionId };
    if (recordId) params.RecordId = recordId;
    return apiClient.delete('/form990n/delete', { params });
  },

  validate: (submissionId: string, recordIds: string[]) => {
    const params: Record<string, string> = { SubmissionId: submissionId };
    if (recordIds.length > 0) params.RecordIds = recordIds.join(',');
    return apiClient.get('/form990n/validate', { params });
  },

  transmit: (data: TransmitRequest) =>
    apiClient.post('/form990n/transmit', data),

  getPDF: (submissionId: string, recordIds?: string[]) =>
    apiClient.get('/form990n/getPDF', {
      params: {
        SubmissionId: submissionId,
        ...(recordIds ? { RecordIds: recordIds.join(',') } : {}),
      },
    }),

  status: (submissionId: string, recordIds?: string[]) =>
    apiClient.get('/form990n/status', {
      params: {
        SubmissionId: submissionId,
        ...(recordIds ? { RecordIds: recordIds.join(',') } : {}),
      },
    }),
};
