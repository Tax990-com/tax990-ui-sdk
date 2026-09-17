import { useState } from 'react';
import { Card, CardBody, CardHeader, Divider, Button } from '@heroui/react';
import { Copy, Check } from 'lucide-react';

interface Props {
  data: unknown;
  title?: string;
}

export default function JsonViewer({ data, title }: Props) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const json = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="card-default mt-4">
      {title && (
        <>
          <CardHeader className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-grey">{title}</span>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={handleCopy}
              className="text-grey hover:text-tertiary h-6 w-6 min-w-6"
              aria-label="Copy JSON"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </CardHeader>
          <Divider className="bg-grey-lighten-2" />
        </>
      )}
      <CardBody className="p-0">
        <pre className="bg-grey-lighten-3 text-success text-xs p-4 rounded-b-lg overflow-x-auto max-h-96 font-mono">
          {json}
        </pre>
      </CardBody>
    </Card>
  );
}
