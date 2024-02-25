
class Instagram extends SocialMedia {
    
    //csrftoken and sessionid are required
    constructor(cookies, userId) {
        super("Instagram", "assets/instagram.png", ["home", "notifications"]);
        this.cookies = cookies;

        this.userId = userId;
        this.fb_dtsg = null;
        //random 28 char long string
        this.deviceId = [...Array(28).keys()]
            .map(_ => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)])
            .join("");
    }

    async updateDetails(account) {
        const response = await window.__TAURI__.http.fetch("https://www.instagram.com/api/v1/users/web_profile_info/?username=" + account.identifier, {
            headers: {
                "Host": "www.instagram.com",
                "Referer": `https://www.instagram.com/${account.identifier}/`,
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "GET",
        });

        if (response.status != 200) {
            return Result.err(response.data?.message ?? JSON.stringify(response.data));
        }

        return Result.ok(new SocialMediaAccount(
            this,
            response.data?.data?.user?.full_name ?? response.data?.data?.user?.username ?? username,
            account.identifier,
            corsify(response.data?.data?.user?.profile_pic_url_hd ?? response.data?.user?.profile_pic_url)
        ));
    }

    async update_fb_dtsg() {
        const response = await window.__TAURI__.http.fetch("https://www.instagram.com/", {
            headers: {
                "Origin": "https://www.instagram.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid
            },
            method: "GET",
            responseType: 2,
        });

        const split_ = response.data.split('"DTSGInitialData":{"token":"')[1];

        if (split_ == null) {
            console.error("Cannot update fb_dtsg");
            return;
        }

        this.fb_dtsg = split_.split('"')[0];
    }

    async getFeed(cursor) {
        if (this.fb_dtsg == null) {
            await this.update_fb_dtsg();
        }

        const response = await window.__TAURI__.http.fetch("https://www.instagram.com/api/graphql", {
            headers: {
                "Origin": "https://www.instagram.com",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "X-FB-Friendly-Name": "PolarisFeedRootPaginationCachedQuery_subscribe",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459"
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "PolarisFeedRootPaginationCachedQuery_subscribe",
                variables: JSON.stringify({
                    after: cursor?.value ?? null,
                    before: null,
                    data: {
                        device_id: this.deviceId,
                        is_async_ads_double_request: "0",
                        is_async_ads_in_headload_enabled: "0",
                        is_async_ads_rti: "0",
                        rti_delivery_backend: "0",
                        pagination_source: "feed_recs",
                        recs_paging_token: JSON.stringify({
                            total_num_items: cursor?.count ?? 0,
                            last_organic_item: {
                                id: cursor?.last_item,
                                index: (cursor?.count ?? 1) - 1
                            }
                        })
                    },
                    first: 0,
                    last: null,
                    variant: "home"
                }),
                doc_id: "7105628329545299",
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });

        if (response.status != 200) {
            return Result.err(response.data);
        }

        const data = response.data?.data?.xdt_api__v1__feed__timeline__connection;

        if (data == null) {
            return Result.err(response.data);
        }

        const edges = data.edges
            .filter(x => x.node.__typename == "XDTFeedItem" && x.node.explore_story != null)
            .map(x => x.node.explore_story);
            
        return Result.ok({
            posts: edges.map(x => {
                let media = [];
                switch (x.media.media_type) {
                    case 19: //text only
                        break;
                    case 1: //photo only
                    case 8: //photo + caption
                        media = [new Media(corsify(x.media.image_versions2.candidates[0].url), "photo", null)];
                        break;
                    case 2: //video
                        media = [new Media(
                            undefined,
                            "video",
                            x.media.video_versions.map(x => { return { url: corsify(x.url), content_type: "video/mp4"} })
                        )];
                        break;
                    default:
                        console.error("(instagram.js:getFeed) unsupported media_type " + x.media.media_type.toString());
                        break;
                };
                return new GenericPost(
                    new SocialMediaAccount(
                        this,
                        x.media.owner.full_name,
                        x.media.owner.username,
                        corsify(x.media.owner.profile_pic_url)
                    ),
                    x.media?.caption?.text ?? "",
                    media,
                    [
                        new Stat(this, "favorite", x.media.like_count, x.media.has_liked, x.id, true),
                        new Stat(this, "comment", x.media.comment_count, false, x.id, false),
                    ],
                    x.media.taken_at
                )
                }
            ),
            cursor: {
                value: data.page_info.has_next_page ? data.page_info.end_cursor : null,
                last_item: edges[edges.length-1].media.id,
                count: edges.length
            }
        });
    }

    async getUnreadNotificationCount() {
        await this.update_fb_dtsg();

        const response = await window.__TAURI__.http.fetch("https://www.instagram.com/api/graphql", {
            headers: {
                "Origin": "https://www.instagram.com",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "X-FB-Friendly-Name": "PolarisNotificationsNavItemQuery",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "PolarisNotificationsNavItemQuery",
                variables: JSON.stringify({
                    device_id: this.deviceId
                }),
                doc_id: "7308902195792159",
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });

        return response?.data?.data?.xdt_notification_badge?.badge_count?.total_count ?? 0;
    }

    async getNotifications() {
        const response = await window.__TAURI__.http.fetch("https://www.instagram.com/api/v1/news/inbox/", {
            headers: {
                "Origin": "https://www.instagram.com",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "POST",
        });

        if (response.status != 200) {
            return Result.err(response.data);
        }

        return Result.ok(response.data?.new_stories?.map(x => new GenericNotification(x.args.text, this)) ?? []);
    }

    async markNotificationsAsRead() {
        await window.__TAURI__.http.fetch("https://www.instagram.com/api/v1/news/inbox_seen/", {
            headers: {
                "Origin": "https://www.instagram.com",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "POST",
        });
    }

    async activate(icon_name, identifier) {
        if (icon_name != "favorite") {
            console.err("(instagram.js:activate) invalid icon name: " + icon_name)
            return;
        }

        await window.__TAURI__.http.fetch("https://www.instagram.com/api/graphql", {
            headers: {
                "Origin": "https://www.instagram.com",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "X-FB-Friendly-Name": "usePolarisLikeMediaLikeMutation",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "usePolarisLikeMediaLikeMutation",
                variables: JSON.stringify({
                    media_id: identifier
                }),
                doc_id: "6496452950454065",
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });
    }

    async deactivate(icon_name, identifier) {
        if (icon_name != "favorite") {
            console.err("(instagram.js:deactivate) invalid icon name: " + icon_name)
            return;
        }

        await window.__TAURI__.http.fetch("https://www.instagram.com/api/graphql", {
            headers: {
                "Origin": "https://www.instagram.com",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "X-FB-Friendly-Name": "usePolarisLikeMediaUnlikeMutation",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "usePolarisLikeMediaUnlikeMutation",
                variables: JSON.stringify({
                    media_id: identifier
                }),
                doc_id: "6078458168920923",
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });
    }

    static async login(username, password) {
        //hack to get a csrftoken
        let response = await window.__TAURI__.http.fetch("https://www.instagram.com/", {
            headers: {
                "Origin": "https://www.instagram.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
            },
            method: "GET",
            responseType: 2,
        });

        const csrftoken = response.data.split('csrf_token":"')[1].split('"')[0];

        //#PWD_INSTAGRAM_BROWSER:0: time : password
        const enc_password = `#PWD_INSTAGRAM_BROWSER:0:${Math.round((new Date()).getTime() / 1000)}:${password}`;

        response = await window.__TAURI__.http.fetch("https://www.instagram.com/api/v1/web/accounts/login/ajax/", {
            headers: {
                "Origin": "https://www.instagram.com",
                "X-CSRFToken": csrftoken,
                "Cookie": `csrftoken=${csrftoken};`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                enc_password: enc_password,
                optIntoOneTap: "false",
                queryParams: "{}",
                trustedDeviceRecords: "{}",
                username: username
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });

        if (response.status != 200) {
            return Result.err(response.data?.message ?? JSON.stringify(response.data));
        }

        const csrf_cookie = Array.from(response.rawHeaders["set-cookie"]).find(x => x.startsWith("csrftoken")).split(";")[0] + ";";
        const sessionid = Array.from(response.rawHeaders["set-cookie"]).find(x => x.startsWith("sessionid")).split(";")[0] + ";";
        const userId = response.data.userId;

        response = await window.__TAURI__.http.fetch("https://www.instagram.com/api/v1/users/web_profile_info/?username=" + username, {
            headers: {
                "Host": "www.instagram.com",
                "Referer": `https://www.instagram.com/${username}/`,
                "X-CSRFToken": csrf_cookie.split(";")[0].split("=")[1],
                "Cookie": csrf_cookie + sessionid + "ds_user_id=" + userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "936619743392459",
            },
            method: "GET",
        });

        if (response.status != 200) {
            return Result.err(response.data?.message ?? JSON.stringify(response.data));
        }

        return Result.ok(new SocialMediaAccount(
            new Instagram({
                csrftoken: csrf_cookie,
                sessionid: sessionid
            }, userId),
            response.data?.data?.user?.full_name ?? response.data?.data?.user?.username ?? username,
            username,
            corsify(response.data?.data?.user?.profile_pic_url_hd ?? response.data?.user?.profile_pic_url)
        ));
    }
}