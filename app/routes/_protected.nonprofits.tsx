import { useState, useCallback } from 'react';
import { Card, CardBody, CardHeader, Input, Button, Divider } from '@heroui/react';
import { Building2, Search, RefreshCw } from 'lucide-react';
import { nonprofitsService } from '@/services/nonprofitsService';
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

export default function Nonprofits() {
  const [ein, setEin] = useState('');
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

  const handleSearch = async () => {
    if (!ein.trim()) {
      addToast('error', 'Please enter an EIN');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await nonprofitsService.getOrganizationDetailsByEIN(ein.replace(/\D/g, ''));
      setResult(data);
      addToast('success', 'Organization found');
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
        {/* <Building2 size={24} className="text-primary" /> */}
        Nonprofit Search
      </h2>
      <p className="text-grey mt-1 text-sm">
        Look up tax-exempt organization details by EIN.
      </p>

      <div className="max-w-2xl">
        <Card className="card-default mt-6">
          <CardHeader className="px-5 pt-4 pb-0">
            <h3 className="text-sm font-semibold text-tertiary">Search by EIN</h3>
          </CardHeader>
          <Divider className="mt-3 bg-grey-lighten-2" />
          <CardBody className="p-5">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="form-label mb-1 inline-block" htmlFor="ein-search">
                  Employer Identification Number (EIN)
                </label>
                <Input
                  id="ein-search"
                  placeholder="XX-XXXXXXX or 9 digits"
                  value={ein}
                  onValueChange={setEin}
                  variant="bordered"
                  isRequired
                  description="Enter a 9-digit EIN to look up the organization's details from the IRS database."
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="group"
                  classNames={INPUT_CLASSNAMES}
                />
              </div>
              <Button
                color="primary"
                onPress={handleSearch}
                isLoading={loading}
                startContent={!loading && <Search size={14} />}
                className="shrink-0 mb-6"
              >
                Search
              </Button>
            </div>
          </CardBody>
        </Card>

        <JsonViewer data={result} title="Organization Details" />
      </div>
    </div>
  );
}
