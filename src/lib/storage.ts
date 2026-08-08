/**
 * Product photographs, in Supabase Storage.
 *
 * They used to be written to public/uploads/products/ on the server's own
 * disk, which works on a VPS and nowhere else. A serverless filesystem is
 * read-only, and where it is writable it belongs to one instance and is
 * discarded with it -- so an image the admin uploaded would be served by
 * exactly one machine, until that machine went away and the product page
 * started rendering a broken image.
 *
 * This talks to the Storage REST API with fetch rather than pulling in
 * @supabase/supabase-js. The client library is a good deal of code for three
 * requests, and the application already has its own Postgres connection, so
 * the only thing it would add here is a dependency.
 */

export const BUCKET = 'product-images'

const projectUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Copy the Project URL from Supabase ' +
        '(Project Settings -> API) into the environment.'
    )
  }
  return url.replace(/\/$/, '')
}

/**
 * The service role key, which bypasses every storage policy.
 *
 * Server-only, and deliberately not prefixed NEXT_PUBLIC_ -- anything with
 * that prefix is compiled into the browser bundle, and this key can read and
 * write every bucket and every table in the project. It is read inside the
 * function rather than at module load so that importing this file on a
 * deployment that has no uploads configured does not throw.
 */
const serviceKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Copy the service_role key from ' +
        'Supabase (Project Settings -> API) into the server environment. It must ' +
        'never be given a NEXT_PUBLIC_ prefix.'
    )
  }
  return key
}

/** Where a browser fetches the image from. Public bucket, so no signing. */
export const publicUrlFor = (filename: string): string =>
  `${projectUrl()}/storage/v1/object/public/${BUCKET}/${filename}`

export const uploadImage = async (
  filename: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string> => {
  const response = await fetch(`${projectUrl()}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey()}`,
      'Content-Type': contentType,
      // Never overwrite. Filenames are generated, so a collision means
      // something is wrong rather than something is being replaced.
      'x-upsert': 'false',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Storage refused the upload (${response.status}): ${await response.text()}`)
  }

  return publicUrlFor(filename)
}

export const deleteImage = async (filename: string): Promise<void> => {
  const response = await fetch(`${projectUrl()}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceKey()}` },
  })

  // 404 means it is already gone, which is the state the caller wanted.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Storage refused the delete (${response.status}): ${await response.text()}`)
  }
}
