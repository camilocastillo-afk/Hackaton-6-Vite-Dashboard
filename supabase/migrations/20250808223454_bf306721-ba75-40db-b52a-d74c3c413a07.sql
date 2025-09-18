-- Address linter warning: set stable search_path for validation function
ALTER FUNCTION public.solicitudes_certificados_validate() SET search_path = public;