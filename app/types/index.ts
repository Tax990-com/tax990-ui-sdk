export interface USAddress {
  Address1: string | null;
  Address2: string | null;
  City: string | null;
  State: string | null;
  ZipCd: string | null;
}

export interface ForeignAddress {
  Address1: string | null;
  Address2: string | null;
  City: string | null;
  ProvinceOrStateNm: string | null;
  Country: string | null;
  PostalCd: string | null;
}

export interface PrincipalOfficer {
  OfficerNm: string | null;
  IsForeign: boolean;
  USAddress: USAddress | null;
  ForeignAddress: ForeignAddress | null;
}

export interface Business {
  BusinessId: string | null;
  BusinessNm: string | null;
  EIN: string | null;
  DBANm: string | null;
  InCareOfNm: string | null;
  EmailAddress: string | null;
  Phone: string | null;
  IsForeign: boolean;
  USAddress: USAddress | null;
  ForeignAddress: ForeignAddress | null;
}

export interface Form990NData {
  SequenceId: string | null;
  RecordId: string | null;
  TaxYr: string | null;
  TaxPeriodBeginDt: string | null;
  TaxPeriodEndDt: string | null;
  IsGrossReceiptsUnder50K: boolean;
  IsOrganizationTerminated: boolean;
  WebsiteAddress: string | null;
  PrincipalOfficer: PrincipalOfficer | null;
}

export interface Form990NRecord {
  Business: Business;
  Form990N: Form990NData;
}

export interface StructuredError {
  Classification: string | null;
  Code: string | null;
  Message: string | null;
  Field: string | null;
}

export interface SuccessRecord {
  SequenceId: string | null;
  RecordId: string | null;
  BusinessId: string | null;
  RecordStatus: string | null;
  CreatedTs: string | null;
  UpdatedTs: string | null;
  ReturnNumber: string | null;
  Message: string | null;
}

export interface ErrorRecord {
  SequenceId: string | null;
  RecordId: string | null;
  BusinessId: string | null;
  RecordStatus: string | null;
  Errors: StructuredError[] | null;
}

export interface GetSuccessRecord extends SuccessRecord {
  Business: Business | null;
  Form990N: {
    TaxYear: string | null;
    TaxPeriodBeginDate: string | null;
    TaxPeriodEndDate: string | null;
    IsGrossReceiptsUnder50K: boolean | null;
    IsOrganizationTerminated: boolean | null;
    WebsiteAddress: string | null;
    PrincipalOfficer: PrincipalOfficer | null;
  } | null;
}

export interface Form990NRecordsEnvelope<S, E> {
  SuccessRecords: S[] | null;
  ErrorRecords: E[] | null;
}

export interface ApiResponse<S = SuccessRecord, E = ErrorRecord> {
  StatusCode: number;
  StatusNm: string | null;
  StatusMessage: string | null;
  CorrelationId: string | null;
  SubmissionId: string | null;
  Form990NRecords: Form990NRecordsEnvelope<S, E> | null;
  Errors: StructuredError[] | null;
}

export interface CreateRequest {
  Form990NRecords: Form990NRecord[];
}

export interface UpdateRequest {
  SubmissionId: string;
  IsAllowPartialUpdates: boolean;
  Form990NRecords: Form990NRecord[];
}

export interface TransmitRequest {
  SubmissionId: string;
  RecordIds?: string[];
}

export interface OAuthTokenResponse {
  AccessToken: string;
  TokenType: string;
  ExpiresIn: number;
}

export interface OrganizationDetail {
  EIN: string | null;
  OrganizationNm: string | null;
  City: string | null;
  State: string | null;
  Country: string | null;
}

export interface NonprofitsResponse {
  StatusCode: number;
  StatusMessage: string | null;
  OrganizationDetail: OrganizationDetail | null;
}

export interface PingResponse {
  StatusCode: number;
  Message: string | null;
}

export interface UtilityResponse<T = unknown> {
  StatusCode: number;
  StatusMessage: string | null;
  Data: T | null;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}
