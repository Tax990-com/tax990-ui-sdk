import { useState } from 'react';
import { Navigate } from 'react-router';
import { Card, CardBody, CardHeader, Input, Button, Divider } from '@heroui/react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/auth';

export default function SignIn() {
  const { user, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const ok = signIn(username, password);
    if (!ok) setError('Invalid username or password');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-tertiary-lighten-1 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
        
          <div className='flex items-center justify-center mb-6'>
            <img src='/images/logo-dev.svg'></img>
          </div>
          <h1 className="text-2xl font-bold text-tertiary">Tax990 SDK Explorer</h1>
          <p className="text-sm text-grey mt-1">Sign in to access the dashboard</p>
        </div>

        <Card className="card-default ">
          <CardHeader className="flex flex-col items-start px-6 pt-4 pb-0">
            <h2 className="text-lg font-semibold text-tertiary">Sign In</h2>
            <p className="text-sm text-grey">Enter your credentials to continue</p>
          </CardHeader>
          <Divider className="mt-4 bg-grey-lighten-2" />
          <CardBody className="px-6 py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className={`${error ? 'error' : 'default'} mb-0`}>
                <label className="text-[14px] text-grey mt-0 inline-block" htmlFor="username">
                  Username
                </label>
                <Input
                  isRequired
                  isInvalid={!!error}
                  id="username"
                  name="username"
                  placeholder="Enter your username"
                  value={username}
                  onValueChange={setUsername}
                  startContent={<User size={16} className="text-grey-lighten-1" />}
                  variant="bordered"
                  className="group mt-0"
                  classNames={{
                    input: '!text-black font-medium placeholder:text-grey-lighten-1 placeholder:font-normal',
                    inputWrapper: [
                      'border rounded mt-0',
                      error ? 'group-hover:!border-danger' : 'group-hover:!border-grey',
                      'focus-within:!border-secondary focus-within:ring-1 focus-within:ring-secondary',
                      error ? 'input-error' : 'input-default',
                    ],
                  }}
                />
              </div>

              <div className={`${error ? 'error' : 'default'} mb-0`}>
                <label className="text-[14px] text-grey mt-0 inline-block" htmlFor="password">
                  Password
                </label>
                <Input
                  isRequired
                  isInvalid={!!error}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onValueChange={setPassword}
                  startContent={<Lock size={16} className="text-grey-lighten-1" />}
                  variant="bordered"
                  className="group mt-0"
                  errorMessage={error}
                  classNames={{
                    input: '!text-black font-medium placeholder:text-grey-lighten-1 placeholder:font-normal',
                    inputWrapper: [
                      'border rounded mt-0',
                      error ? 'group-hover:!border-danger' : 'group-hover:!border-grey',
                      'focus-within:!border-secondary focus-within:ring-1 focus-within:ring-secondary',
                      error ? 'input-error' : 'input-default',
                    ],
                    errorMessage: 'text-[12px] font-medium',
                  }}
                  endContent={
                    <button
                      type="button"
                      aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                      className={`focus:outline-none ${error ? 'text-danger' : 'text-grey'}`}
                      onClick={() => setIsPasswordVisible((v) => !v)}
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="w-[18px] pointer-events-none" />
                      ) : (
                        <Eye className="w-[18px] pointer-events-none" />
                      )}
                    </button>
                  }
                />
              </div>

              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                className="mt-2 rounded "
                fullWidth
              >
                Sign In
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-grey mt-6">
          Tax990 Public API SDK v2.0
        </p>
      </div>
    </div>
  );
}