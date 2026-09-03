import { getSiteSettings } from "@/lib/settings"

/**
 * Owner-controlled strip above the header. Renders nothing unless the toggle is
 * on AND there is text — an empty banner is worse than none.
 */
export async function AnnouncementBanner() {
  const { showAnnouncement, announcementText } = await getSiteSettings()
  const text = announcementText.trim()
  if (!showAnnouncement || !text) return null

  return (
    <div className="bg-brand-700 px-4 py-2 text-center">
      <p className="text-xs font-medium text-white sm:text-sm">{text}</p>
    </div>
  )
}
