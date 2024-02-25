class Profile {
    constructor(accounts, main_account) {
        //SocialMediaAccount[]
        this.accounts = accounts;
        //SocialMediaAccount
        this.main_account = main_account;
    }

    validAccounts() {
        return this.accounts.filter(x => x.valid);
    }
}

class SocialMediaAccount {
    constructor(social_media, friendly_name, identifier, pfp_url) {
        //SocialMedia
        this.social_media = social_media;
        this.friendly_name = friendly_name,
        this.identifier = identifier;
        this.pfp_url = pfp_url;
        this.valid = true;
    }

    async updateAccount() {
        try {
            const account = await this.social_media.updateDetails(this);

            if (account.is_ok()) {
                const account_value = account.value();
                this.social_media = account_value.social_media;
                this.friendly_name = account_value.friendly_name;
                this.identifier = account_value.identifier;
                this.pfp_url = account_value.pfp_url;
                this.valid = true;
            } else {
                this.valid = false;
            }
        } catch (e) {
            console.error("Cannot update account: " + e);
            this.valid = false;
        }
    }
}

let __g_OS_TYPE;
window.__TAURI__.os.type().then(x => OS_TYPE = x);

var OneSpaceLib = OneSpaceLib || {
    osType: function() {
        return OS_TYPE;
    },

    updateAccounts: async function(force) {
        const now = Math.round((new Date()).getTime() / 1000);
        
        //if an hour has passed
        if (now - parseInt(localStorage.getItem("lastAccountUpdateDate") ?? 0) < 3600
            && !force) {
            return;
        }

        let profile = OneSpaceLib.getProfile();

        if (profile.accounts.length == 0) {
            return;
        }

        for (let x of profile.accounts) {
            await x.updateAccount();
        }

        let updated_main_account = profile.accounts.find(x => x.social_media.name == profile.main_account.social_media.name 
            && x.identifier == profile.main_account.identifier);

        if (!updated_main_account?.valid) {
            this.main_account = profile.accounts.find(x => x.valid);
        }

        OneSpaceLib.setProfile(profile);
        localStorage.setItem("lastAccountUpdateDate", now.toString());
    },

    getProfile: function() {
        let profile = JSON.parse(localStorage.getItem("profile")) ?? new Profile([], null);
        profile.__proto__ = (new Profile([], null)).__proto__;
        for (let account of profile.accounts) {
            account.__proto__ = (new SocialMediaAccount(null, null, null, null)).__proto__;
        }
        
        for (let account of profile.accounts) {
            switch (account.social_media.name.toLowerCase()) {
                case "twitter":
                    account.social_media.__proto__ = (new Twitter()).__proto__;
                    break;
                case "instagram":
                    account.social_media.__proto__ = (new Instagram()).__proto__;
                    break;
                case "threads":
                    account.social_media.__proto__ = (new Threads()).__proto__;
                    break;
                default:
                    console.error("(main-lib.js:OneSpaceLib.getProfile) unsupported social media type: " + JSON.stringify(account.social_media));
                    account.social_media.__proto__ = (new SocialMedia("unknown", "assets/test-image.jpeg", [""]));
                    break;
            }
        }

        return profile;
    },

    setProfile: function(profile) {
        localStorage.setItem("profile", JSON.stringify(profile));
    },

    loadPosts: function(posts) {
        const post_container = document.getElementById("posts");
        const post_template = document.getElementById("post-template");
        const stat_template = document.getElementById("stat-template");
        const content_loader_div = document.getElementById("content-loader");
        
        for (const post of posts) {
            let post_div = post_template.content.cloneNode(true);
            post_div.querySelector(".post-pfp").src = post.poster.pfp_url;
            post_div.querySelector(".post-platform-icon").src = post.poster.social_media.icon_url;
    
            let post_name_container = post_div.querySelector(".post-name-container");
            post_name_container.querySelector("h3").innerHTML  = DOMPurify.sanitize(post.poster.friendly_name);
            post_name_container.querySelector("p").innerHTML  = DOMPurify.sanitize("@" + post.poster.identifier);

            post_div.querySelector(".post-creation-date").innerHTML = new Date(post.created_at)
                .toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });

            let post_content = post_div.querySelector(".post-content");
            post_content.querySelector("p").innerHTML = DOMPurify.sanitize(post.text);
    
            if (post.media != null) {
                for (const media of post.media) {
                    if (media.type == "photo" || media.type == "animated_gif") {
                        let elem = document.createElement("img");
                        elem.src = media.url;
                        elem.classList.add("post-media");
                        post_content.appendChild(elem);
                    } else if (media.type == "video") {
                        let elem = document.createElement("video");
                        elem.controls = true;
    
                        for (const variant of media.variants) {
                            let source = document.createElement("source");
                            source.src = variant.url;
                            source.type = variant.content_type;
                            elem.appendChild(source);
                        }
                        
                        elem.classList.add("post-media");
                        post_content.appendChild(elem);
                    } else {
                        console.log(media.type);
                    }
                }
            }
    
            let post_footer = post_div.querySelector(".post-footer");
    
            if (post.stats != null) {
                for (const stat of post.stats) {
                    let stat_div = stat_template.content.cloneNode(true);
    
                    stat_div.querySelector(".material-symbols-outlined").innerHTML = stat.icon_name;

                    const abbreviateNumber = (n) => {
                        if (n < 1e3) return n;
                        if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + "K";
                        if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + "M";
                        if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + "B";
                        if (n >= 1e12) return +(n / 1e12).toFixed(1) + "T";
                    };

                    stat_div.querySelector(".stat-count").innerHTML = abbreviateNumber(stat.count);
                    stat_div.querySelector(".stat-count").value = stat.count;

                    if (stat.interactable) {
                        stat_div.firstElementChild.onclick = function (e) {
                            let icon_elem = this.querySelector(".material-symbols-outlined");
                            let stat_count_elem = this.querySelector(".stat-count");

                            let new_value;

                            if (icon_elem.classList.contains("activated")) {
                                this.querySelector(".material-symbols-outlined").classList.remove("activated");
                                stat.deactivate().then();
                                new_value = parseInt(stat_count_elem.value) - 1;
                            } else {
                                this.querySelector(".material-symbols-outlined").classList.add("activated");
                                stat.activate().then();
                                new_value = parseInt(stat_count_elem.value) + 1;
                            }

                            if (stat_count_elem.value.length > 0) {
                                stat_count_elem.value = new_value;
                                stat_count_elem.innerText = abbreviateNumber(new_value);
                            }
                        };

                        if (stat.is_activated) {
                            stat_div.querySelector(".material-symbols-outlined").classList.add("activated");
                        }
                    }
    
                    post_footer.appendChild(stat_div);
                }
            }
    
            post_container.insertBefore(post_div, content_loader_div);
        }
    },

    async getTotalUnreadNotificationCount() {
        return (await Promise.all(
            OneSpaceLib.getProfile().validAccounts()
            .filter(x => x.social_media.features.includes("notifications"))
            .map(x => x.social_media.getUnreadNotificationCount())
        )).filter(x => x != null)
        .reduce((a, x) => a + x, 0);
    },

    async getAllNotifications() {
        return (await Promise.all(
            OneSpaceLib.getProfile().validAccounts()
            .filter(x => x.social_media.features.includes("notifications"))
            .map(x => x.social_media.getNotifications())
        )).filter(x => x != null)
        .filter(x => x.is_ok())
        .map(x => x.value())
        .flat();
    }
};

//initialization
function __internal_initialize() {
    OneSpaceLib.updateAccounts(false).then();
    
    if (document.getElementById("profile-info") != null) {
        const profile = OneSpaceLib.getProfile();

        if (window.location.pathname != "/settings.html" && profile?.main_account == null) {
            window.location.href ="/settings.html";
            return;
        }

        document.getElementById("pfp").src = profile.main_account.pfp_url;
        document.getElementById("friendly-name").innerHTML = DOMPurify.sanitize(profile.main_account.friendly_name);
        document.getElementById("identifier").innerHTML = DOMPurify.sanitize("@" + profile.main_account.identifier);
    }

    OneSpaceLib.getTotalUnreadNotificationCount().then(count => {
        if (document.getElementById("notification-count-container") != null && count > 0) {
            document.getElementById("notification-count-container").style["display"] = "flex";
            document.getElementById("notification-count").innerHTML = count.toString();
        }
    })
}

window.addEventListener('load', __internal_initialize);