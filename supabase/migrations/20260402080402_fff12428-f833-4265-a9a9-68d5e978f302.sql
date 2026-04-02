
-- Properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  property_type TEXT NOT NULL DEFAULT 'Office',
  status TEXT NOT NULL DEFAULT 'Active',
  price NUMERIC NOT NULL DEFAULT 0,
  sqft INTEGER NOT NULL DEFAULT 0,
  cap_rate NUMERIC DEFAULT 0,
  noi NUMERIC DEFAULT 0,
  irr NUMERIC DEFAULT 0,
  year_built INTEGER,
  units INTEGER DEFAULT 0,
  occupancy NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Properties viewable by authenticated"
ON public.properties FOR SELECT TO authenticated USING (true);

CREATE POLICY "PM and admins can create properties"
ON public.properties FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "PM and admins can update properties"
ON public.properties FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lenders table
CREATE TABLE public.lenders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  loan_type TEXT NOT NULL DEFAULT 'Senior Debt',
  commitment NUMERIC NOT NULL DEFAULT 0,
  drawn NUMERIC NOT NULL DEFAULT 0,
  rate TEXT,
  maturity DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  compliance_score INTEGER DEFAULT 100,
  project_id UUID REFERENCES public.projects(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lenders viewable by authenticated"
ON public.lenders FOR SELECT TO authenticated USING (true);

CREATE POLICY "PM and admins can create lenders"
ON public.lenders FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'lender'::app_role)
);

CREATE POLICY "PM and admins can update lenders"
ON public.lenders FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'lender'::app_role)
);

CREATE TRIGGER update_lenders_updated_at
BEFORE UPDATE ON public.lenders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Treasury transactions table
CREATE TABLE public.treasury_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  txn_number TEXT NOT NULL,
  description TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  account TEXT NOT NULL DEFAULT 'General',
  project_name TEXT,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  txn_type TEXT NOT NULL DEFAULT 'Ledger',
  status TEXT NOT NULL DEFAULT 'Posted',
  requestor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treasury viewable by authenticated"
ON public.treasury_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "PM and admins can create treasury entries"
ON public.treasury_transactions FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "PM and admins can update treasury entries"
ON public.treasury_transactions FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE TRIGGER update_treasury_transactions_updated_at
BEFORE UPDATE ON public.treasury_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
