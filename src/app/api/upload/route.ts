import { NextRequest, NextResponse } from 'next/server'
import { deleteImage, uploadImage } from '@/lib/storage'

/**
 * Never evaluated at build time -- it reads credentials from the environment.
 */
export const dynamic = 'force-dynamic'

/**
 * The extension comes from the MIME type we have already validated, never
 * from the supplied name. file.name is entirely under the caller's control,
 * so uploading "x.html" used to write x.html into a directory the web server
 * handed out verbatim. The name itself is discarded.
 */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!EXTENSIONS[file.type]) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const filename = `${timestamp}-${randomString}.${EXTENSIONS[file.type]}`

    const url = await uploadImage(filename, await file.arrayBuffer(), file.type)

    return NextResponse.json({
      success: true,
      url,
      filename,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Delete uploaded file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { error: 'No filename provided' },
        { status: 400 }
      )
    }

    /**
     * Only a bare filename, never a path.
     *
     * The disk version of this resolved the path and compared it against the
     * uploads directory, because path.join would happily normalise
     * "../../../.env" straight out of that folder and this endpoint deletes
     * whatever it is pointed at. Storage keys have the same shape and the
     * same hazard: a slash addresses a different folder in the bucket. The
     * names this route hands out never contain one, so anything that does is
     * refused rather than sanitised.
     */
    if (!/^[A-Za-z0-9._-]+$/.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    await deleteImage(filename)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
