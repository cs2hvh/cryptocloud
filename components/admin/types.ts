export type TabKey = 'hosts' | 'servers' | 'users';

export type IpRow = { ip: string };

export type Pool = {
  mac: string;
  ips: IpRow[];
  label?: string;
};

export type TemplateRow = {
  name: string;
  vmid: string;
  type?: 'qemu' | 'lxc';
};

export type ServerFormState = {
  id: string | null;
  name: string;
  ip: string;
  ownerId: string;
  ownerEmail: string;
  status: string;
  location: string;
  os: string;
  node: string;
  vmid: string;
  cpuCores: string;
  memoryMb: string;
  diskGb: string;
  details: string;
};

export type HostRow = {
  id: string;
  name?: string | null;
  host_url?: string | null;
  node?: string | null;
  location?: string | null;
  template_vmid?: number | null;
  allow_insecure_tls?: boolean | null;
  storage?: string | null;
  bridge?: string | null;
  gateway_ip?: string | null;
  dns_primary?: string | null;
  dns_secondary?: string | null;
  is_active?: boolean | null;
  public_ip_pools?: Array<{
    mac?: string | null;
    label?: string | null;
    public_ip_pool_ips?: Array<{ ip?: string | null }>;
  }>;
  proxmox_templates?: Array<{
    name?: string | null;
    vmid?: number | null;
    type?: 'qemu' | 'lxc' | null;
  }>;
};

export type ServerRow = {
  id: string;
  name?: string | null;
  ip?: string | null;
  owner_email?: string | null;
  owner_id?: string | null;
  status?: string | null;
  location?: string | null;
  created_at?: string | null;
};

export type UserRow = {
  id: string;
  email?: string | null;
  banned?: boolean | null;
  email_confirmed_at?: string | null;
  role?: string | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
};
