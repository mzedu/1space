class SocialMedia {
    constructor(name, icon_url, features) {
        this.name = name;
        this.icon_url = icon_url;
        this.features = features;
    }

    async updateDetails(account) {}

    async getFeed(cursor) {}

    async getUnreadNotificationCount() {}
    async getNotifications() {}
    async markNotificationsAsRead() {}

    async activate(icon_name, identifier) {}
    async deactivate(icon_name, identifier) {}

    async createPost(text) {}

    static maxPostLength() {}
}

class Stat {
    constructor(social_media, icon_name, count, is_activated, identifier, interactable) {
        this.social_media = social_media;
        this.icon_name = icon_name;
        this.count = count;
        this.is_activated = is_activated;
        this.identifier = identifier;
        this.interactable = interactable;
    }

    async activate() {
        await this.social_media.activate(this.icon_name, this.identifier);
    }

    async deactivate() {
        await this.social_media.deactivate(this.icon_name, this.identifier);
    }
}

class Media {
    constructor(url, type, variants) {
        this.url = url;
        this.type = type;
        this.variants = variants;
    }
}

class GenericPost {
    constructor(poster, text, media, stats, created_at) {
        //SocialMediaAccount
        this.poster = poster;
        //string
        this.text = text;
        //Media[]
        this.media = media;
        //Stat[]
        this.stats = stats;
        //integer
        this.created_at = created_at;
    }
}

class GenericNotification {
    constructor(text, social_media) {
        this.text = text;
        this.social_media = social_media;
    }
}