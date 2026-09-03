import {
  LayoutDashboard,
  Briefcase,
  Users,
  Compass,
  FileText,
  Presentation,
  Calendar,
  Share2,
  TrendingUp,
  BarChart3,
  FolderArchive,
  CheckSquare,
  Wallet,
  Inbox,
  Settings,
  CircleDot,
} from 'lucide-react';

interface NavIconProps {
  name: string;
  className?: string;
}

export function NavIcon({ name, className = 'h-4 w-4' }: NavIconProps) {
  switch (name) {
    case 'LayoutDashboard':
      return <LayoutDashboard className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Presentation':
      return <Presentation className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    case 'Share2':
      return <Share2 className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'BarChart3':
      return <BarChart3 className={className} />;
    case 'FolderArchive':
      return <FolderArchive className={className} />;
    case 'CheckSquare':
      return <CheckSquare className={className} />;
    case 'Wallet':
      return <Wallet className={className} />;
    case 'Inbox':
      return <Inbox className={className} />;
    case 'Settings':
      return <Settings className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}
