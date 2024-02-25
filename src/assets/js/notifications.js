async function populateNotifications() {
    const notification_container = document.getElementById("notification-container");
    const notification_template = document.getElementById("notification-template");
    
    const notifications = await OneSpaceLib.getAllNotifications();
    const should_mark_as_read = await OneSpaceLib.getTotalUnreadNotificationCount() > 0;

    let marked_social_medias = [];

    for (const notification of notifications) {
        let notification_div = notification_template.content.cloneNode(true);

        notification_div.querySelector(".notification-icon").src = notification.social_media.icon_url;
        notification_div.querySelector(".notification-text").innerText = DOMPurify.sanitize(notification.text);

        notification_container.appendChild(notification_div);

        if (should_mark_as_read && !marked_social_medias.includes(notification.social_media.name)) {
            await notification.social_media.markNotificationsAsRead();

            marked_social_medias.push(notification.social_media.name);
        }
    }
}

window.addEventListener('load', () => populateNotifications().then());