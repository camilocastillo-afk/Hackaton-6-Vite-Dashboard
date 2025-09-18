-- Enable RLS and allow authenticated users full CRUD on empleados
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Authenticated can select empleados"
ON public.empleados
FOR SELECT
TO authenticated
USING (true);

-- INSERT
CREATE POLICY "Authenticated can insert empleados"
ON public.empleados
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE
CREATE POLICY "Authenticated can update empleados"
ON public.empleados
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE
CREATE POLICY "Authenticated can delete empleados"
ON public.empleados
FOR DELETE
TO authenticated
USING (true);