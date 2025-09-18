-- Enable RLS and add secure policies + validation triggers for solicitudes_certificados

-- Enable RLS
ALTER TABLE public.solicitudes_certificados ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
DROP POLICY IF EXISTS "authenticated can select solicitudes_certificados" ON public.solicitudes_certificados;
CREATE POLICY "authenticated can select solicitudes_certificados"
ON public.solicitudes_certificados
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated can insert solicitudes_certificados" ON public.solicitudes_certificados;
CREATE POLICY "authenticated can insert solicitudes_certificados"
ON public.solicitudes_certificados
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated can update solicitudes_certificados" ON public.solicitudes_certificados;
CREATE POLICY "authenticated can update solicitudes_certificados"
ON public.solicitudes_certificados
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Validation trigger: prevent changing estado after final and require fields
CREATE OR REPLACE FUNCTION public.solicitudes_certificados_validate()
RETURNS trigger AS $$
BEGIN
  -- Always update fecha_edicion on updates
  IF TG_OP = 'UPDATE' THEN
    NEW.fecha_edicion := now();
  END IF;

  -- Require motivo when setting Rechazada
  IF NEW.estado_solicitud = 'Rechazada' AND (NEW.motivo IS NULL OR btrim(NEW.motivo) = '') THEN
    RAISE EXCEPTION 'El motivo es obligatorio cuando la solicitud es Rechazada';
  END IF;

  -- Require link when setting Procesada
  IF NEW.estado_solicitud = 'Procesada' AND (NEW.link IS NULL OR btrim(NEW.link) = '') THEN
    RAISE EXCEPTION 'El link es obligatorio cuando la solicitud es Procesada';
  END IF;

  -- Prevent changing estado after it is final (Procesada o Rechazada)
  IF TG_OP = 'UPDATE' AND (OLD.estado_solicitud IN ('Procesada','Rechazada'))
     AND (NEW.estado_solicitud IS DISTINCT FROM OLD.estado_solicitud) THEN
    RAISE EXCEPTION 'No se puede cambiar el estado después de estar Procesada o Rechazada';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_solicitudes_certificados_validate ON public.solicitudes_certificados;
CREATE TRIGGER tr_solicitudes_certificados_validate
BEFORE INSERT OR UPDATE ON public.solicitudes_certificados
FOR EACH ROW EXECUTE FUNCTION public.solicitudes_certificados_validate();