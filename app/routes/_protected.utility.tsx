import { useState, useCallback } from 'react';
import { Card, CardBody, CardHeader, Input, Button, Listbox, ListboxItem, Divider } from '@heroui/react';
import { Wrench, RefreshCw, Zap } from 'lucide-react';
import { utilityService } from '@/services/utilityService';
import JsonViewer from '@/components/JsonViewer';
import ToastContainer from '@/components/Toast';
import type { Toast } from '@/types';

const INPUT_CLASSNAMES = {
  input: '!text-black font-medium placeholder:text-grey-lighten-1 placeholder:font-normal',
  inputWrapper: [
    'border rounded',
    'group-hover:!border-grey',
    'focus-within:!border-secondary focus-within:ring-1 focus-within:ring-secondary',
    'input-default',
  ],
};

type Endpoint =
  | 'ping' | 'getAllSubmissionIds' | 'getSubmissionIdByBusinessId'
  | 'getSubmissionIdByRecordId' | 'getRecordIds' | 'getRecordIdBySubmissionId'
  | 'getRecordDetailBySubmissionId' | 'getAllBusinessIds' | 'getBusinessIdBySubmissionId';

interface EndpointDef {
  key: Endpoint;
  label: string;
  method: string;
  fields: { name: string; label: string; placeholder?: string }[];
}

const endpoints: EndpointDef[] = [
  { key: 'ping', label: 'Ping', method: 'GET', fields: [] },
  { key: 'getAllSubmissionIds', label: 'Get All Submission IDs', method: 'GET', fields: [] },
  { key: 'getSubmissionIdByBusinessId', label: 'Submission ID by Business ID', method: 'GET', fields: [{ name: 'businessId', label: 'Business ID', placeholder: 'bus-xxxx' }] },
  { key: 'getSubmissionIdByRecordId', label: 'Submission ID by Record ID', method: 'GET', fields: [{ name: 'recordId', label: 'Record ID', placeholder: 'rec-xxxx' }] },
  { key: 'getRecordIds', label: 'Get Record IDs', method: 'GET', fields: [] },
  { key: 'getRecordIdBySubmissionId', label: 'Record ID by Submission ID', method: 'GET', fields: [{ name: 'submissionId', label: 'Submission ID', placeholder: 'sub-xxxx' }] },
  { key: 'getRecordDetailBySubmissionId', label: 'Record Detail by Submission ID', method: 'GET', fields: [{ name: 'submissionId', label: 'Submission ID', placeholder: 'sub-xxxx' }] },
  { key: 'getAllBusinessIds', label: 'Get All Business IDs', method: 'GET', fields: [] },
  { key: 'getBusinessIdBySubmissionId', label: 'Business ID by Submission ID', method: 'GET', fields: [{ name: 'submissionId', label: 'Submission ID', placeholder: 'sub-xxxx' }] },
];

export default function Utility() {
  const [active, setActive] = useState<Endpoint>('ping');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});

  let nextToastId = 0;
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now() + nextToastId++;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const exec = async () => {
    setLoading(true);
    setResult(null);
    try {
      let data: unknown;
      switch (active) {
        case 'ping': data = await utilityService.ping(); break;
        case 'getAllSubmissionIds': data = await utilityService.getAllSubmissionIds(); break;
        case 'getSubmissionIdByBusinessId': data = await utilityService.getSubmissionIdByBusinessId(fields.businessId); break;
        case 'getSubmissionIdByRecordId': data = await utilityService.getSubmissionIdByRecordId(fields.recordId); break;
        case 'getRecordIds': data = await utilityService.getRecordIds(); break;
        case 'getRecordIdBySubmissionId': data = await utilityService.getRecordIdBySubmissionId(fields.submissionId); break;
        case 'getRecordDetailBySubmissionId': data = await utilityService.getRecordDetailBySubmissionId(fields.submissionId); break;
        case 'getAllBusinessIds': data = await utilityService.getAllBusinessIds(); break;
        case 'getBusinessIdBySubmissionId': data = await utilityService.getBusinessIdBySubmissionId(fields.submissionId); break;
      }
      setResult(data);
      addToast('success', 'Request completed');
    } catch (e: any) {
      setResult(e.responseData ?? { error: e.message });
      addToast('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const def = endpoints.find((e) => e.key === active)!;

  return (
    <div className="p-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h2 className="text-2xl font-semibold">
        
        Utility Endpoints
      </h2>
      <p className="text-grey mt-1 text-sm">
        9 utility lookups: ping, submission IDs, record IDs, business IDs, and more.
      </p>

      <div className="mt-6 flex gap-6">
        <Card className="card-default w-60 shrink-0 self-start">
          <CardBody className="p-2">
            <Listbox
              aria-label="Utility endpoints"
              selectionMode="single"
              selectedKeys={[active]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as Endpoint;
                if (key) { setActive(key); setResult(null); setFields({}); }
              }}
            >
              {endpoints.map(({ key, label }) => (
                <ListboxItem key={key} startContent={key === 'ping' ? <Zap size={14} /> : undefined}>
                  {label}
                </ListboxItem>
              ))}
            </Listbox>
          </CardBody>
        </Card>

        <div className="flex-1 min-w-0">
          <Card className="card-default">
            <CardHeader className="px-5 pt-4 pb-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-tertiary">{def.label}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{def.method}</span>
              </div>
            </CardHeader>
            <Divider className="mt-3 bg-grey-lighten-2" />
            <CardBody className="p-5 flex flex-col gap-4">
              {def.fields.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {def.fields.map((f) => (
                    <div key={f.name}>
                      <label className="form-label mb-1 inline-block" htmlFor={`field-${f.name}`}>
                        {f.label}
                      </label>
                      <Input
                        id={`field-${f.name}`}
                        placeholder={f.placeholder}
                        value={fields[f.name] || ''}
                        onValueChange={(v) => setFields({ ...fields, [f.name]: v })}
                        variant="bordered"
                        className="group"
                        classNames={INPUT_CLASSNAMES}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-grey">No parameters required.</p>
              )}

              <div>
                <Button
                  color="primary"
                  onPress={exec}
                  isLoading={loading}
                  startContent={!loading && <RefreshCw size={14} />}
                >
                  Execute
                </Button>
              </div>
            </CardBody>
          </Card>

          <JsonViewer data={result} title="Response" />
        </div>
      </div>
    </div>
  );
}
