import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, LogOut, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function UserProfile() {
  const { user, logout, resendEmailVerification } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      toast.error('Failed to sign out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendEmailVerification();
    } catch (error) {
      toast.error('Failed to send verification email');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    if (user?.phoneNumber) return user.phoneNumber;
    return 'User';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL} alt={getDisplayName()} />
            <AvatarFallback className="bg-blue-600 text-white text-sm">
              {getInitials(getDisplayName())}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
            {user?.email && (
              <div className="flex items-center gap-2">
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
                {!user.emailVerified && user.providerData?.[0]?.providerId === 'password' && (
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-600">Unverified</span>
                  </div>
                )}
              </div>
            )}
            {user?.phoneNumber && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.phoneNumber}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {!user?.emailVerified && user?.providerData?.[0]?.providerId === 'password' && (
          <>
            <DropdownMenuItem onClick={handleResendVerification} className="cursor-pointer">
              <Mail className="mr-2 h-4 w-4" />
              <span>Verify Email</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}