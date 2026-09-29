import {
  Building2,
  ChartColumn,
  FileText,
  Flag,
  Gauge,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Megaphone,
  Settings,
  Users,
} from 'lucide-react';

// Role → sidebar sections. `badge` names a live count the shell fills in.
export const NAV = {
  admin: {
    home: '/admin',
    search: '/admin/employees',
    menu: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, badge: 'runningCampaigns' },
      { to: '/admin/employees', label: 'Employees', icon: Users },
      { to: '/admin/templates', label: 'Templates', icon: LayoutTemplate },
      { to: '/admin/training', label: 'Training', icon: GraduationCap },
      { to: '/admin/analytics', label: 'Analytics', icon: ChartColumn },
      { to: '/admin/reports', label: 'Reports', icon: FileText },
    ],
    preferences: [
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/help', label: 'Help Center', icon: HelpCircle },
    ],
  },
  employee: {
    home: '/portal',
    search: '/portal/training',
    menu: [
      { to: '/portal', label: 'Overview', icon: Gauge, end: true },
      {
        to: '/portal/training',
        label: 'My Training',
        icon: GraduationCap,
        badge: 'pendingTraining',
      },
      { to: '/portal/quizzes', label: 'Quizzes', icon: ListChecks },
      { to: '/portal/reports', label: 'Reports Sent', icon: Flag },
    ],
    preferences: [
      { to: '/portal/settings', label: 'Settings', icon: Settings },
      { to: '/portal/help', label: 'Help Center', icon: HelpCircle },
    ],
  },
  system_admin: {
    home: '/system',
    search: '/system',
    menu: [
      { to: '/system', label: 'Organisations', icon: Building2, end: true },
      { to: '/system/analytics', label: 'Platform Analytics', icon: ChartColumn },
      { to: '/system/templates', label: 'Templates', icon: LayoutTemplate },
    ],
    preferences: [
      { to: '/system/settings', label: 'Settings', icon: Settings },
      { to: '/system/help', label: 'Help Center', icon: HelpCircle },
    ],
  },
};

// Per-page subtitle under "Hi, {name}" in the top bar. First prefix match wins.
export const SUBTITLES = [
  ['/admin/campaigns/new', 'Set up a new simulated attack'],
  ['/admin/campaigns/', 'Campaign results and outcomes'],
  ['/admin/campaigns', 'Plan, launch and track simulated attacks'],
  ['/admin/employees', 'Everyone enrolled in simulations'],
  ['/admin/templates', 'Kenya-specific attack scenarios'],
  ['/admin/training', 'Remedial training and quizzes'],
  ['/admin/analytics', 'Trends across campaigns and departments'],
  ['/admin/reports', 'Export results for leadership and audit'],
  ['/admin/settings', 'Manage your account and organisation'],
  ['/admin/help', 'Guides and answers'],
  ['/admin', "Here's your organisation's security posture"],
  ['/portal/training/', 'Work through the module, then take the quiz'],
  ['/portal/training', 'Modules assigned to you'],
  ['/portal/quizzes', 'Check what you’ve learned'],
  ['/portal/reports', 'Suspicious messages you flagged'],
  ['/portal/settings', 'Your account'],
  ['/portal/help', 'Guides and answers'],
  ['/portal', 'Your security score and training at a glance'],
  ['/system', 'Platform administration'],
];

export const subtitleFor = (pathname) =>
  SUBTITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] || '';
