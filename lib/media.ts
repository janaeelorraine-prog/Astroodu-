// Turn a pasted video URL into something we can render.
// Supports YouTube, Vimeo, and direct video files; falls back to a link.

export type EmbedInfo =
  | { type: 'iframe'; src: string }
  | { type: 'file'; src: string }
  | { type: 'link'; src: string }

export function videoEmbed(raw: string): EmbedInfo {
  const url = (raw || '').trim()
  if (!url) return { type: 'link', src: url }

  // YouTube — watch, youtu.be, shorts, embed
  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i)
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` }

  // Vimeo
  const vim = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vim) return { type: 'iframe', src: `https://player.vimeo.com/video/${vim[1]}` }

  // Direct video file
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)) return { type: 'file', src: url }

  return { type: 'link', src: url }
}
