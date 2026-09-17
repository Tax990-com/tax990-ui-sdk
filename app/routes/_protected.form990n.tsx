import { useState, useCallback, useId } from 'react';
import {
  Tabs, Tab, Card, CardBody, CardHeader, Input, Select, SelectItem,
  Button, Checkbox, Divider, Switch,
} from '@heroui/react';
import { FileText, RefreshCw, Send } from 'lucide-react';
import { form990nService } from '@/services/form990nService';
import { US_STATES, TAX_YEARS } from '@/constants';
import JsonViewer from '@/components/JsonViewer';
import ToastContainer from '@/components/Toast';
import type { Toast, Form990NRecord, USAddress, ForeignAddress } from '@/types';

const INPUT_CLASSNAMES = {
  input: '!text-black font-medium placeholder:text-grey-lighten-1 placeholder:font-normal',
  inputWrapper: [
    'border rounded',
    'group-hover:!border-grey',
    'focus-within:!border-secondary focus-within:ring-1 focus-within:ring-secondary',
    'input-default',
  ],
};

const SELECT_CLASSNAMES = {
  trigger: 'auto-complete-wrapper input-default',
  popoverContent: '!border !border-grey-lighten-2 !shadow-none !outline-0',
};

/* ── Address helpers ─────────────────────────────────────────────── */

interface AddrState {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  province: string;
  country: string;
}

const blankAddr = (): AddrState => ({
  line1: '', line2: '', city: '', state: '', zip: '', province: '', country: '',
});

function toUSAddr(a: AddrState): USAddress | null {
  if (!a.line1 && !a.city && !a.state && !a.zip) return null;
  return {
    Address1: a.line1 || null, Address2: a.line2 || null,
    City: a.city || null, State: a.state || null, ZipCd: a.zip || null,
  };
}

function toForeignAddr(a: AddrState): ForeignAddress | null {
  if (!a.line1 && !a.city && !a.province && !a.country) return null;
  return {
    Address1: a.line1 || null, Address2: a.line2 || null,
    City: a.city || null, ProvinceOrStateNm: a.province || null,
    Country: a.country || null, PostalCd: a.zip || null,
  };
}

/* ── Shared sub-components ───────────────────────────────────────── */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="card-default">
      <CardHeader className="px-5 pt-4 pb-0">
        <h3 className="text-sm font-semibold text-tertiary">{title}</h3>
      </CardHeader>
      <Divider className="mt-3 bg-grey-lighten-2" />
      <CardBody className="p-5">{children}</CardBody>
    </Card>
  );
}

function Field({ label, htmlFor, className, children }: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="form-label mb-1 inline-block" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function AddressFields({
  idPrefix, foreign, addr, onChange,
}: {
  idPrefix: string;
  foreign: boolean;
  addr: AddrState;
  onChange: (key: keyof AddrState, val: string) => void;
}) {
  const id = (suffix: string) => `${idPrefix}-${suffix}`;

  return (
    <div className="grid grid-cols-6 gap-4">
      <Field label="Address line 1" htmlFor={id('line1')} className="col-span-6">
        <Input id={id('line1')} value={addr.line1} onValueChange={(v) => onChange('line1', v)} variant="bordered" isRequired placeholder="Street address" className="group" classNames={INPUT_CLASSNAMES} />
      </Field>
      <Field label="Address line 2 (optional)" htmlFor={id('line2')} className="col-span-6">
        <Input id={id('line2')} value={addr.line2} onValueChange={(v) => onChange('line2', v)} variant="bordered" placeholder="Suite, unit, etc." className="group" classNames={INPUT_CLASSNAMES} />
      </Field>
      {foreign ? (
        <>
          <Field label="City" htmlFor={id('city')} className="col-span-3">
            <Input id={id('city')} value={addr.city} onValueChange={(v) => onChange('city', v)} variant="bordered" isRequired className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Province / state" htmlFor={id('province')} className="col-span-3">
            <Input id={id('province')} value={addr.province} onValueChange={(v) => onChange('province', v)} variant="bordered" isRequired className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Country" htmlFor={id('country')} className="col-span-3">
            <Input id={id('country')} value={addr.country} onValueChange={(v) => onChange('country', v)} variant="bordered" isRequired placeholder="FIPS code, e.g. CA" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Postal code" htmlFor={id('zip')} className="col-span-3">
            <Input id={id('zip')} value={addr.zip} onValueChange={(v) => onChange('zip', v)} variant="bordered" isRequired className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
        </>
      ) : (
        <>
          <Field label="City" htmlFor={id('city')} className="col-span-2">
            <Input id={id('city')} value={addr.city} onValueChange={(v) => onChange('city', v)} variant="bordered" isRequired className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="State" htmlFor={id('state')} className="col-span-2">
            <Select
              id={id('state')}
              placeholder="--Select--"
              selectedKeys={addr.state ? [addr.state] : []}
              onSelectionChange={(keys) => onChange('state', Array.from(keys)[0] as string)}
              variant="bordered"
              radius="sm"
              className="rounded-sm bg-white"
              classNames={SELECT_CLASSNAMES}
            >
              {US_STATES.map((s) => <SelectItem key={s.value}>{s.label}</SelectItem>)}
            </Select>
          </Field>
          <Field label="ZIP code" htmlFor={id('zip')} className="col-span-2">
            <Input id={id('zip')} value={addr.zip} onValueChange={(v) => onChange('zip', v)} variant="bordered" isRequired placeholder="12345" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
        </>
      )}
    </div>
  );
}

/* ── Record form hook ────────────────────────────────────────────── */

function useRecordForm() {
  const [biz, setBiz] = useState({
    BusinessId: '', BusinessNm: '', EIN: '', DBANm: '',
    InCareOfNm: '', EmailAddress: '', Phone: '',
  });
  const [bizIsForeign, setBizIsForeign] = useState(false);
  const [bizAddr, setBizAddr] = useState(blankAddr());

  const [f990n, setF990n] = useState({
    SequenceId: '', RecordId: '', TaxYr: '2024',
    TaxPeriodBeginDt: '2024-01-01', TaxPeriodEndDt: '2024-12-31',
    IsGrossReceiptsUnder50K: true, IsOrganizationTerminated: false,
    WebsiteAddress: '',
  });

  const [officerNm, setOfficerNm] = useState('');
  const [offIsForeign, setOffIsForeign] = useState(false);
  const [offAddr, setOffAddr] = useState(blankAddr());

  const updateBiz = (k: string, v: string) => setBiz((p) => ({ ...p, [k]: v }));
  const updateF990n = (k: string, v: any) => setF990n((p) => ({ ...p, [k]: v }));
  const updateBizAddr = (k: keyof AddrState, v: string) => setBizAddr((p) => ({ ...p, [k]: v }));
  const updateOffAddr = (k: keyof AddrState, v: string) => setOffAddr((p) => ({ ...p, [k]: v }));

  const buildRecord = (): Form990NRecord => ({
    Business: {
      BusinessId: biz.BusinessId || null,
      BusinessNm: biz.BusinessNm || null,
      EIN: biz.EIN || null,
      DBANm: biz.DBANm || null,
      InCareOfNm: biz.InCareOfNm || null,
      EmailAddress: biz.EmailAddress || null,
      Phone: biz.Phone || null,
      IsForeign: bizIsForeign,
      USAddress: bizIsForeign ? null : toUSAddr(bizAddr),
      ForeignAddress: bizIsForeign ? toForeignAddr(bizAddr) : null,
    },
    Form990N: {
      SequenceId: f990n.SequenceId || null,
      RecordId: f990n.RecordId || null,
      TaxYr: f990n.TaxYr || null,
      TaxPeriodBeginDt: f990n.TaxPeriodBeginDt || null,
      TaxPeriodEndDt: f990n.TaxPeriodEndDt || null,
      IsGrossReceiptsUnder50K: f990n.IsGrossReceiptsUnder50K,
      IsOrganizationTerminated: f990n.IsOrganizationTerminated,
      WebsiteAddress: f990n.WebsiteAddress || null,
      PrincipalOfficer: {
        OfficerNm: officerNm || null,
        IsForeign: offIsForeign,
        USAddress: offIsForeign ? null : toUSAddr(offAddr),
        ForeignAddress: offIsForeign ? toForeignAddr(offAddr) : null,
      },
    },
  });

  return {
    biz, updateBiz, bizIsForeign, setBizIsForeign, bizAddr, updateBizAddr,
    f990n, updateF990n, officerNm, setOfficerNm, offIsForeign, setOffIsForeign, offAddr, updateOffAddr,
    buildRecord,
  };
}

/* ── Record form fields ──────────────────────────────────────────── */

function RecordFormFields({ rec, mode = 'create' }: {
  rec: ReturnType<typeof useRecordForm>;
  mode?: 'create' | 'update';
}) {
  const uid = useId();
  const id = (suffix: string) => `${uid}-${suffix}`;

  return (
    <div className="flex flex-col gap-4 mt-4">
      <SectionCard title="Business information">
        <div className="grid grid-cols-6 gap-4">
          <Field label="Business name" htmlFor={id('business-name')} className="col-span-4">
            <Input id={id('business-name')} value={rec.biz.BusinessNm} onValueChange={(v) => rec.updateBiz('BusinessNm', v)} variant="bordered" isRequired placeholder="Example Nonprofit" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="EIN" htmlFor={id('ein')} className="col-span-2">
            <Input id={id('ein')} value={rec.biz.EIN} onValueChange={(v) => rec.updateBiz('EIN', v)} variant="bordered" isRequired placeholder="123456789" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="DBA name (optional)" htmlFor={id('dba')} className="col-span-3">
            <Input id={id('dba')} value={rec.biz.DBANm} onValueChange={(v) => rec.updateBiz('DBANm', v)} variant="bordered" placeholder="Doing business as" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="In care of (optional)" htmlFor={id('care-of')} className="col-span-3">
            <Input id={id('care-of')} value={rec.biz.InCareOfNm} onValueChange={(v) => rec.updateBiz('InCareOfNm', v)} variant="bordered" placeholder="C/O name" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Email (optional)" htmlFor={id('email')} className="col-span-3">
            <Input id={id('email')} value={rec.biz.EmailAddress} onValueChange={(v) => rec.updateBiz('EmailAddress', v)} variant="bordered" placeholder="contact@example.org" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Phone" htmlFor={id('phone')} className="col-span-3">
            <Input id={id('phone')} value={rec.biz.Phone} onValueChange={(v) => rec.updateBiz('Phone', v)} variant="bordered" isRequired placeholder="5551234567" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Business ID (optional)" htmlFor={id('business-id')} className="col-span-3">
            <Input id={id('business-id')} value={rec.biz.BusinessId} onValueChange={(v) => rec.updateBiz('BusinessId', v)} variant="bordered" placeholder="Assigned by API" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
        </div>
        <div className="flex items-center gap-2 mt-5 mb-3">
          <Switch size="sm" isSelected={rec.bizIsForeign} onValueChange={rec.setBizIsForeign}>
            <span className="text-sm">Foreign address</span>
          </Switch>
        </div>
        <AddressFields idPrefix={id('biz-addr')} foreign={rec.bizIsForeign} addr={rec.bizAddr} onChange={rec.updateBizAddr} />
      </SectionCard>

      <SectionCard title="Form 990-N details">
        <div className="grid grid-cols-6 gap-4">
          <Field label="Tax year" htmlFor={id('tax-year')} className="col-span-2">
            <Select
              id={id('tax-year')}
              placeholder="--Select--"
              selectedKeys={[rec.f990n.TaxYr]}
              onSelectionChange={(keys) => rec.updateF990n('TaxYr', Array.from(keys)[0] as string)}
              variant="bordered"
              radius="sm"
              className="rounded-sm bg-white"
              classNames={SELECT_CLASSNAMES}
            >
              {TAX_YEARS.map((y) => <SelectItem key={y}>{y}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Period begin" htmlFor={id('period-begin')} className="col-span-2">
            <Input id={id('period-begin')} value={rec.f990n.TaxPeriodBeginDt} onValueChange={(v) => rec.updateF990n('TaxPeriodBeginDt', v)} variant="bordered" isRequired placeholder="2024-01-01" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Period end" htmlFor={id('period-end')} className="col-span-2">
            <Input id={id('period-end')} value={rec.f990n.TaxPeriodEndDt} onValueChange={(v) => rec.updateF990n('TaxPeriodEndDt', v)} variant="bordered" isRequired placeholder="2024-12-31" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          <Field label="Sequence ID (optional)" htmlFor={id('sequence-id')} className={mode === 'update' ? 'col-span-3' : 'col-span-6'}>
            <Input id={id('sequence-id')} value={rec.f990n.SequenceId} onValueChange={(v) => rec.updateF990n('SequenceId', v)} variant="bordered" placeholder="Optional" className="group" classNames={INPUT_CLASSNAMES} />
          </Field>
          {mode === 'update' && (
            <Field label="Record ID" htmlFor={id('record-id')} className="col-span-3">
              <Input id={id('record-id')} value={rec.f990n.RecordId} onValueChange={(v) => rec.updateF990n('RecordId', v)} variant="bordered" isRequired placeholder="Required for update" className="group" classNames={INPUT_CLASSNAMES} />
            </Field>
          )}
        </div>
        <div className="flex gap-6 mt-4">
          <Checkbox isSelected={rec.f990n.IsGrossReceiptsUnder50K} onValueChange={(v) => rec.updateF990n('IsGrossReceiptsUnder50K', v)} color="primary" isDisabled={mode === 'update'}>
            Gross receipts under $50K
          </Checkbox>
          <Checkbox isSelected={rec.f990n.IsOrganizationTerminated} onValueChange={(v) => rec.updateF990n('IsOrganizationTerminated', v)} color="primary">
            Organization terminated
          </Checkbox>
        </div>
        <Field label="Website (optional)" htmlFor={id('website')} className="mt-4">
          <Input id={id('website')} value={rec.f990n.WebsiteAddress} onValueChange={(v) => rec.updateF990n('WebsiteAddress', v)} variant="bordered" placeholder="https://example.org" className="group" classNames={INPUT_CLASSNAMES} />
        </Field>
      </SectionCard>

      <SectionCard title="Principal officer">
        <Field label="Officer name" htmlFor={id('officer-name')}>
          <Input id={id('officer-name')} value={rec.officerNm} onValueChange={rec.setOfficerNm} variant="bordered" isRequired placeholder="Jane Doe" className="group" classNames={INPUT_CLASSNAMES} />
        </Field>
        <div className="flex items-center gap-2 mt-5 mb-3">
          <Switch size="sm" isSelected={rec.offIsForeign} onValueChange={rec.setOffIsForeign}>
            <span className="text-sm">Foreign address</span>
          </Switch>
        </div>
        <AddressFields idPrefix={id('off-addr')} foreign={rec.offIsForeign} addr={rec.offAddr} onChange={rec.updateOffAddr} />
      </SectionCard>
    </div>
  );
}

/* ── Tab: Create ─────────────────────────────────────────────────── */

function CreateTab({ exec, loading }: { exec: (fn: () => Promise<unknown>) => void; loading: boolean }) {
  const rec = useRecordForm();

  return (
    <>
      <RecordFormFields rec={rec} mode="create" />
      <div className="mt-5">
        <Button
          color="primary"
          size="lg"
          onPress={() => exec(() => form990nService.create({ Form990NRecords: [rec.buildRecord()] }))}
          isLoading={loading}
          startContent={!loading && <Send size={16} />}
        >
          Create Form 990-N
        </Button>
      </div>
    </>
  );
}

/* ── Tab: Update ─────────────────────────────────────────────────── */

function UpdateTab({ exec, loading }: { exec: (fn: () => Promise<unknown>) => void; loading: boolean }) {
  const rec = useRecordForm();
  const uid = useId();
  const [submissionId, setSubmissionId] = useState('');
  const [partial, setPartial] = useState(false);

  const handlePartialToggle = (v: boolean) => {
    setPartial(v);
    if (v) {
      // Clear defaulted fields when entering partial mode so they aren't
      // sent as inadvertent updates — the API merges only the fields we send.
      rec.updateF990n('TaxYr', '');
      rec.updateF990n('TaxPeriodBeginDt', '');
      rec.updateF990n('TaxPeriodEndDt', '');
    } else {
      rec.updateF990n('TaxYr', '2024');
      rec.updateF990n('TaxPeriodBeginDt', '2024-01-01');
      rec.updateF990n('TaxPeriodEndDt', '2024-12-31');
    }
  };

  const buildUpdateRecord = () => {
    const full = rec.buildRecord();
    if (!partial) return full;

    // Partial update: only include fields the user explicitly set.
    // The API merges these onto the existing record before validating,
    // so null/omitted fields are preserved from the existing data.
    const Business: Record<string, unknown> = {};
    if (rec.biz.BusinessId.trim()) Business.BusinessId = rec.biz.BusinessId.trim();
    if (rec.biz.BusinessNm.trim()) Business.BusinessNm = rec.biz.BusinessNm.trim();
    if (rec.biz.EIN.trim()) Business.EIN = rec.biz.EIN.trim();
    if (rec.biz.DBANm.trim()) Business.DBANm = rec.biz.DBANm.trim();
    if (rec.biz.InCareOfNm.trim()) Business.InCareOfNm = rec.biz.InCareOfNm.trim();
    if (rec.biz.EmailAddress.trim()) Business.EmailAddress = rec.biz.EmailAddress.trim();
    if (rec.biz.Phone.trim()) Business.Phone = rec.biz.Phone.trim();
    if (rec.bizAddr.line1 || rec.bizAddr.city || rec.bizAddr.state ||
        rec.bizAddr.zip || rec.bizAddr.province || rec.bizAddr.country) {
      Business.IsForeign = rec.bizIsForeign;
      Business.USAddress = full.Business.USAddress;
      Business.ForeignAddress = full.Business.ForeignAddress;
    }

    const Form990N: Record<string, unknown> = {
      RecordId: rec.f990n.RecordId.trim() || null,
      IsGrossReceiptsUnder50K: rec.f990n.IsGrossReceiptsUnder50K,
      IsOrganizationTerminated: rec.f990n.IsOrganizationTerminated,
    };
    if (rec.f990n.SequenceId.trim()) Form990N.SequenceId = rec.f990n.SequenceId.trim();
    if (rec.f990n.TaxYr) Form990N.TaxYr = rec.f990n.TaxYr;
    if (rec.f990n.TaxPeriodBeginDt.trim()) Form990N.TaxPeriodBeginDt = rec.f990n.TaxPeriodBeginDt.trim();
    if (rec.f990n.TaxPeriodEndDt.trim()) Form990N.TaxPeriodEndDt = rec.f990n.TaxPeriodEndDt.trim();
    if (rec.f990n.WebsiteAddress.trim()) Form990N.WebsiteAddress = rec.f990n.WebsiteAddress.trim();
    if (rec.officerNm.trim() || rec.offAddr.line1 || rec.offAddr.city ||
        rec.offAddr.state || rec.offAddr.province || rec.offAddr.country) {
      Form990N.PrincipalOfficer = full.Form990N.PrincipalOfficer;
    }

    return { Business, Form990N } as unknown as Form990NRecord;
  };

  return (
    <>
      <Card className="card-default mt-4">
        <CardBody className="p-5">
          <div className="grid grid-cols-6 gap-4 items-end">
            <Field label="Submission ID" htmlFor={`${uid}-submission-id`} className="col-span-4">
              <Input id={`${uid}-submission-id`} value={submissionId} onValueChange={setSubmissionId} variant="bordered" isRequired placeholder="sub-xxxx" className="group" classNames={INPUT_CLASSNAMES} />
            </Field>
            <div className="col-span-2 flex items-center h-full pt-6">
              <Checkbox isSelected={partial} onValueChange={handlePartialToggle} color="primary">
                Allow partial updates
              </Checkbox>
            </div>
          </div>
          {partial && (
            <p className="mt-3 text-xs text-grey">
              Partial mode: only fields you fill in are sent. Provide <strong>Record ID</strong> to identify the record. Use <strong>Business ID</strong> alone to reference an existing business without re-submitting its details. Tax year and dates are cleared — fill them in only if you want to update them.
            </p>
          )}
        </CardBody>
      </Card>
      <RecordFormFields rec={rec} mode="update" />
      <div className="mt-5">
        <Button
          color="primary"
          size="lg"
          onPress={() => exec(() => form990nService.update({
            SubmissionId: submissionId,
            IsAllowPartialUpdates: partial,
            Form990NRecords: [buildUpdateRecord()],
          }))}
          isLoading={loading}
          startContent={!loading && <Send size={16} />}
        >
          Update Form 990-N
        </Button>
      </div>
    </>
  );
}

/* ── Tab: Simple params ──────────────────────────────────────────── */

function SimpleParamsTab({ fields, onSubmit, loading, btnLabel }: {
  fields: { key: string; label: string; required?: boolean; placeholder?: string }[];
  onSubmit: (vals: Record<string, string>) => void;
  loading: boolean;
  btnLabel: string;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, '']))
  );
  const uid = useId();

  return (
    <Card className="card-default mt-4">
      <CardBody className="p-5">
        <div className={`grid gap-4 ${fields.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {fields.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`${uid}-${f.key}`}>
              <Input
                id={`${uid}-${f.key}`}
                placeholder={f.placeholder}
                value={vals[f.key]}
                onValueChange={(v) => setVals({ ...vals, [f.key]: v })}
                variant="bordered"
                isRequired={f.required}
                className="group"
                classNames={INPUT_CLASSNAMES}
              />
            </Field>
          ))}
        </div>
        <div className="mt-4">
          <Button
            color="primary"
            onPress={() => onSubmit(vals)}
            isLoading={loading}
            startContent={!loading && <RefreshCw size={14} />}
          >
            {btnLabel}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export default function Form990N() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  let nextToastId = 0;
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now() + nextToastId++;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const exec = async (fn: () => Promise<unknown>) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await fn();
      setResult(data);
      addToast('success', 'Request completed successfully');
    } catch (e: any) {
      setResult(e.responseData ?? { error: e.message });
      addToast('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h2 className="text-2xl font-semibold">
        Form 990-N
      </h2>
      <p className="text-grey mt-1 text-sm">
        Full lifecycle: Create, Get, List, Update, Delete, Validate, Transmit, Get PDF, and Status.
      </p>

      <Tabs
        aria-label="Form 990-N Operations"
        color="primary"
        variant="underlined"
        className="mt-6"
        classNames={{ tabList: 'gap-0', tab: 'px-3' }}
        onSelectionChange={() => setResult(null)}
      >
        <Tab key="create" title="Create">
          <CreateTab exec={exec} loading={loading} />
        </Tab>
        <Tab key="get" title="Get">
          <SimpleParamsTab
            fields={[
              { key: 'submissionId', label: 'Submission ID', required: true },
              { key: 'recordId', label: 'Record ID (optional)' },
            ]}
            onSubmit={(vals) => exec(() => form990nService.get(vals.submissionId, vals.recordId || undefined))}
            loading={loading}
            btnLabel="Get"
          />
        </Tab>
        <Tab key="list" title="List">
          <SimpleParamsTab
            fields={[
              { key: 'submissionId', label: 'Submission ID (required if no Business ID)' },
              { key: 'businessId', label: 'Business ID (required if no Submission ID)' },
            ]}
            onSubmit={(vals) => exec(() => form990nService.list(vals.submissionId || undefined, vals.businessId || undefined))}
            loading={loading}
            btnLabel="List"
          />
        </Tab>
        <Tab key="update" title="Update">
          <UpdateTab exec={exec} loading={loading} />
        </Tab>
        <Tab key="delete" title="Delete">
          <SimpleParamsTab
            fields={[
              { key: 'submissionId', label: 'Submission ID', required: true },
              { key: 'recordId', label: 'Record ID (optional)' },
            ]}
            onSubmit={(vals) => exec(() => form990nService.delete(vals.submissionId, vals.recordId || undefined))}
            loading={loading}
            btnLabel="Delete"
          />
        </Tab>
        <Tab key="validate" title="Validate">
          <SimpleParamsTab
            fields={[
              { key: 'submissionId', label: 'Submission ID', required: true },
              { key: 'recordIds', label: 'Record IDs (comma-separated, optional)', placeholder: 'rec-001,rec-002' },
            ]}
            onSubmit={(vals) => exec(() => form990nService.validate(vals.submissionId, vals.recordIds.split(',').map((s: string) => s.trim()).filter(Boolean)))}
            loading={loading}
            btnLabel="Validate"
          />
        </Tab>
        <Tab key="transmit" title="Transmit">
          <SimpleParamsTab
            fields={[
              { key: 'submissionId', label: 'Submission ID', required: true },
              { key: 'recordIds', label: 'Record IDs (comma-separated, optional)' },
            ]}
            onSubmit={(vals) => exec(() => form990nService.transmit({
              SubmissionId: vals.submissionId,
              ...(vals.recordIds ? { RecordIds: vals.recordIds.split(',').map((s: string) => s.trim()) } : {}),
            }))}
            loading={loading}
            btnLabel="Transmit"
          />
        </Tab>
        <Tab key="pdf" title="Get PDF">
          <SimpleParamsTab
            fields={[
              { key: 'submissionId', label: 'Submission ID', required: true },
              { key: 'recordIds', label: 'Record IDs (comma-separated, optional)' },
            ]}
            onSubmit={(vals) => exec(() => form990nService.getPDF(
              vals.submissionId, vals.recordIds ? vals.recordIds.split(',').map((s: string) => s.trim()) : undefined
            ))}
            loading={loading}
            btnLabel="Get PDF"
          />
        </Tab>
        <Tab key="status" title="Status">
          <SimpleParamsTab
            fields={[
              { key: 'submissionId', label: 'Submission ID', required: true },
              { key: 'recordIds', label: 'Record IDs (comma-separated, optional)' },
            ]}
            onSubmit={(vals) => exec(() => form990nService.status(
              vals.submissionId, vals.recordIds ? vals.recordIds.split(',').map((s: string) => s.trim()) : undefined
            ))}
            loading={loading}
            btnLabel="Check Status"
          />
        </Tab>
      </Tabs>

      <JsonViewer data={result} title="API Response" />
    </div>
  );
}
