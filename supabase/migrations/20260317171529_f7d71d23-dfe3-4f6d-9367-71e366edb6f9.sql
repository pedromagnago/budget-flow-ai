
-- Create storage bucket for client document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/xml', 'text/xml']
);

-- RLS: authenticated users can upload to their company folder
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- RLS: authenticated users can read their company's documents
CREATE POLICY "Users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');
