import { Link } from 'react-router';
import { Card, CardBody, Chip } from '@heroui/react';
import { FileText, Wrench, Building2 } from 'lucide-react';

const iconTint = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
} as const;

const cards = [
  {
    to: '/form990n',
    icon: FileText,
    title: 'Form 990-N',
    desc: 'Create, validate, transmit, and manage Form 990-N e-postcard filings.',
    color: 'primary' as const,
    count: 9,
  },
  {
    to: '/utility',
    icon: Wrench,
    title: 'Utility Lookups',
    desc: 'Look up submission IDs, record IDs, and business IDs. Check API health.',
    color: 'secondary' as const,
    count: 9,
  },
  {
    to: '/nonprofits',
    icon: Building2,
    title: 'Nonprofit Search',
    desc: 'Search for tax-exempt organization details by EIN.',
    color: 'success' as const,
    count: 1,
  },
];

const endpointGroups = [
  {
    group: 'Form 990-N',
    items: ['POST /create', 'POST /update', 'GET /get', 'GET /list', 'DELETE /delete', 'GET /validate', 'POST /transmit', 'GET /getPDF', 'GET /status'],
  },
  {
    group: 'Utility',
    items: ['GET /ping', 'GET /getAllSubmissionId', 'GET /getSubmissionIdByBusinessId', 'GET /getSubmissionIdByRecordId', 'GET /getRecordIds', 'GET /getRecordIdBySubmissionId', 'GET /getRecordDetailBySubmissionId', 'GET /getAllBusinessId', 'GET /getBusinessIdBySubmissionId'],
  },
  {
    group: 'Nonprofits',
    items: ['GET /getOrganizationDetailsByEIN'],
  },
];

export default function OverviewPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Tax990 SDK Explorer</h2>
      <p className="text-grey mt-1 text-sm">
        Test and explore all Tax990 Public API endpoints through the SDK.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {cards.map(({ to, icon: Icon, title, desc, color, count }) => (
          <Link key={to} to={to}>
            <Card isPressable className="card-default h-full hover:border-secondary transition-colors">
              <CardBody className="flex flex-row items-start gap-4 p-5">
                <div className={`p-2.5 rounded-xl ${iconTint[color]}`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-tertiary">{title}</h3>
                    <Chip size="sm" variant="flat" color={color}>{count}</Chip>
                  </div>
                  <p className="text-sm text-grey mt-1">{desc}</p>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="card-default mt-10">
        <div className="card-default-header">
          <h3 className="text-sm font-semibold text-tertiary">Supported Endpoints</h3>
        </div>
        <CardBody className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {endpointGroups.map(({ group, items }) => (
              <div key={group}>
                <p className="font-medium text-sm mb-2 text-tertiary">{group} ({items.length})</p>
                <div className="flex flex-col gap-1">
                  {items.map((ep) => {
                    const [method, path] = ep.split(' ');
                    return (
                      <div key={ep} className="flex items-center gap-1.5 text-xs text-grey">
                        <Chip size="sm" variant="flat" className="text-[10px] h-4 min-h-4 px-1.5" color={method === 'POST' ? 'success' : method === 'DELETE' ? 'danger' : 'primary'}>
                          {method}
                        </Chip>
                        <span className="font-mono">{path}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
