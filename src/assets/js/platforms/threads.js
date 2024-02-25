class Threads extends SocialMedia {
    //cookies sessionid and csrftoken are required
    constructor(cookies, userId, fb_dtsg) {
        super("Threads", "assets/threads.png", ["home", "notifications"]);

        this.cookies = cookies;
        this.userId = userId;
        this.fb_dtsg = fb_dtsg;
        //random 28 char long string
        this.deviceId = [...Array(28).keys()]
            .map(_ => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)])
            .join("");
    }

    async updateDetails(account) {
        let response = await window.__TAURI__.http.fetch("https://www.threads.net/", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
            },
            method: "GET",
            responseType: 2, //text
        });

        this.fb_dtsg = response.data.split('"DTSGInitialData",[],{"token":"')[1].split('"')[0];

        response = await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
                "X-FB-Friendly-Name": "BarcelonaProfilePageQuery",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "BarcelonaProfilePageQuery",
                variables: JSON.stringify({
                    userID: this.userId,
                    __relay_internal__pv__BarcelonaIsSuggestedUsersOnProfileEnabledrelayprovider: false,
                    __relay_internal__pv__BarcelonaShouldShowFediverseM075Featuresrelayprovider: false
                }),
                doc_id: "7575854519093637"
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });

        if (response.status != 200) {
            return Result.err(response.data?.message ?? JSON.stringify(response.data));
        }

        return Result.ok(new SocialMediaAccount(
            this,
            response.data?.data?.user?.full_name ?? response.data?.data?.user?.username ?? account.username,
            account.identifier,
            corsify(response.data?.data?.user?.profile_pic_url_hd ?? response.data?.data?.user?.profile_pic_url)
        ));
    }

    async getFeed(cursor) {
        let response;
        if (cursor == null) {
            response = await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
                headers: {
                    "Host": "www.threads.net",
                    "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                    "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Sec-Fetch-Site": "same-origin",
                    "X-IG-App-ID": "238260118697367",
                    "X-FB-Friendly-Name": "BarcelonaFeedQuery",
                },
                method: "POST",
                body: window.__TAURI__.http.Body.form(Object.entries({
                    fb_dtsg: this.fb_dtsg,
                    fb_api_req_friendly_name: "BarcelonaFeedQuery",
                    variables: JSON.stringify({
                        data: {
                            pagination_source: "text_post_feed_threads",
                            reason: "cold_start_fetch"
                        },
                        variant: "for_you",
                        __relay_internal__pv__BarcelonaIsSuggestedUsersInFeedEnabledrelayprovider: true,
                        __relay_internal__pv__BarcelonaIsThreadContextHeaderEnabledrelayprovider: false,
                        __relay_internal__pv__BarcelonaOptionalCookiesEnabledrelayprovider: true,
                        __relay_internal__pv__BarcelonaIsLoggedInrelayprovider: true,
                        __relay_internal__pv__BarcelonaIsViewCountEnabledrelayprovider: false,
                        __relay_internal__pv__BarcelonaShouldShowFediverseM075Featuresrelayprovider: false
                    }),
                    doc_id: "7468081989909997"
                }).reduce((formData, [key, value]) => {
                    formData.append(key, value);
                    return formData;
                }, new FormData()))
            });
        } else {
            response = await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
                headers: {
                    "Host": "www.threads.net",
                    "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                    "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Sec-Fetch-Site": "same-origin",
                    "X-IG-App-ID": "238260118697367",
                    "X-FB-Friendly-Name": "BarcelonaFeedPaginationQuery",
                },
                method: "POST",
                body: window.__TAURI__.http.Body.form(Object.entries({
                    fb_dtsg: this.fb_dtsg,
                    fb_api_req_friendly_name: "BarcelonaFeedPaginationQuery",
                    variables: JSON.stringify({
                        after: cursor,
                        before: null,
                        data: {
                            feed_view_info: "[]",
                            pagination_source: "text_post_feed_threads",
                            reason: "pagination"
                        },
                        first: 10,
                        is_su_in_feed_enabled: true,
                        last: null,
                        variant: "for_you",
                        __relay_internal__pv__BarcelonaIsSuggestedUsersInFeedEnabledrelayprovider: true,
                        __relay_internal__pv__BarcelonaIsThreadContextHeaderEnabledrelayprovider: false,
                        __relay_internal__pv__BarcelonaOptionalCookiesEnabledrelayprovider: true,
                        __relay_internal__pv__BarcelonaIsLoggedInrelayprovider: true,
                        __relay_internal__pv__BarcelonaIsViewCountEnabledrelayprovider: false,
                        __relay_internal__pv__BarcelonaShouldShowFediverseM075Featuresrelayprovider: false
                    }),
                    doc_id: "7205625476197479"
                }).reduce((formData, [key, value]) => {
                    formData.append(key, value);
                    return formData;
                }, new FormData()))
            });
        }

        if (response.status != 200) {
            return Result.err(response.data);
        }

        const edges = response?.data?.data?.feedData?.edges
            .filter(x => x?.node?.__typename == "XDTFeedItem" && x?.node?.text_post_app_thread?.thread_items?.length > 0)
            .map(x => x?.node?.text_post_app_thread?.thread_items?.at(0)?.post)
            .filter(x => x != null && x.text_post_app_info);

        return Result.ok({
            posts: edges.map(x => {
                    let media = [];
                    switch (x.media_type) {
                        case 19: //text only
                            break;
                        case 1: //photo only
                        case 8: //photo + caption
                            media = [new Media(corsify(x.image_versions2.candidates[0].url), "photo", null)];
                            break;
                        case 2: //video
                            media = [new Media(
                                undefined,
                                "video",
                                x.video_versions.map(x => { return { url: corsify(x.url), content_type: "video/mp4"} })
                            )];
                            break;
                        default:
                            console.error("(threads.js:getFeed) unsupported media_type " + x.media_type.toString());
                            break;
                    };

                    return new GenericPost(
                        new SocialMediaAccount(
                            this,
                            x.user.username,
                            x.user.username,
                            corsify(x.user.profile_pic_url)
                        ),
                        x?.caption?.text ?? "",
                        media,
                        [
                            new Stat(this, "favorite", x.like_count, x.has_liked, x.pk, true),
                            new Stat(this, "cycle", "", x.text_post_app_info.share_info.is_reposted_by_viewer, x.pk, true),
                            new Stat(this, "comment", x.text_post_app_info.direct_reply_count, x.pk, false)
                        ],
                        x.taken_at * 1000
                    )
                }),
            cursor: response.data.data.feedData.page_info.has_next_page ? response.data.data.feedData.page_info.end_cursor : null,
        });
    }

    async getUnreadNotificationCount() {
        let response = await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
                "X-FB-Friendly-Name": "BarcelonaNotificationBadgeContextQuery",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "BarcelonaNotificationBadgeContextQuery",
                variables: JSON.stringify({
                    deviceID: this.deviceId
                }),
                doc_id: "10009082599166431"
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });

        return response?.data?.data?.xdt_text_app_notification_badge?.total_count ?? 0;
    }

    async getNotifications() {
        let response = await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
                "X-FB-Friendly-Name": "BarcelonaActivityFeedStoryListQuery",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "BarcelonaActivityFeedStoryListQuery",
                variables: JSON.stringify({}),
                doc_id: "7023275037802208"
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });

        if (response.data?.data?.errors != null || response.status != 200) {
            return Result.err(response.data?.data?.errors ?? response.data);
        }

        return Result.ok(response.data.data.notifications.edges.map(x => {console.log(x);
                return new GenericNotification(`${(x.node.args.profile_name ?? "") + " "}${x.node?.args?.extra?.context ?? ""}`, this)
                }
            ));
    }

    async markNotificationsAsRead() {
        const response = await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
                "X-FB-Friendly-Name": "BarcelonaActivityFeedMarkInboxAsSeenMutation",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: "BarcelonaActivityFeedMarkInboxAsSeenMutation",
                variables: JSON.stringify({}),
                doc_id: "6814057688615993"
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });
    }

    async activate(icon_name, identifier) {
        let friendly_name, doc_id;
        switch (icon_name) {
            case "favorite":
                friendly_name = "useBarcelonaLikeMutationLikeMutation";
                doc_id = "24068295876148027";
                break;
            case "cycle":
                friendly_name = "useBarcelonaCreateRepostMutation",
                doc_id = "7096769960387670";
                break;
            default:
                console.error("(activate:threads.js) unsupported icon_name " + icon_name);
                break;
        }

        await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
                "X-FB-Friendly-Name": friendly_name,
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: friendly_name,
                variables: JSON.stringify({
                    mediaID: identifier,
                }),
                doc_id: doc_id
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });
    }

    async deactivate(icon_name, identifier) {
        let friendly_name, doc_id;
        switch (icon_name) {
            case "favorite":
                friendly_name = "useBarcelonaLikeMutationUnlikeMutation";
                doc_id = "6875788219169196";
                break;
            case "cycle":
                friendly_name = "useBarcelonaDeleteRepostMutation",
                doc_id = "24642409258706360";
                break;
            default:
                console.error("(deactivate:threads.js) unsupported icon_name " + icon_name);
                break;
        }

        await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
                "X-FB-Friendly-Name": friendly_name,
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: this.fb_dtsg,
                fb_api_req_friendly_name: friendly_name,
                variables: JSON.stringify({
                    mediaID: identifier,
                }),
                doc_id: doc_id
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });
    }

    async createPost(text) {
        if (text.length > Threads.maxPostLength()) {
            return;
        }

        const actual_text = text.replace(" ", "+");

        await window.__TAURI__.http.fetch("https://www.threads.net/api/v1/media/configure_text_only_post/", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": this.cookies.csrftoken.split(";")[0].split("=")[1],
                "Cookie": this.cookies.csrftoken + this.cookies.sessionid + "ds_user_id=" + this.userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                caption: actual_text,
                internal_features: "",
                is_meta_only_post: "",
                is_paid_partnership: "",
                publish_mode: "text_post",
                text_post_app_info: JSON.stringify({
                    link_attachment_url: null,
                    reply_control: 0,
                    text_with_entities: {
                        entities: [],
                        text: actual_text
                    }
                }),
                upload_id: Date.now()
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });
    }

    static maxPostLength() {
        return 500;
    }

    static async login(username, password) {
        let response = await window.__TAURI__.http.fetch("https://www.instagram.com/", {
            headers: {
                "Origin": "https://www.instagram.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
            },
            method: "GET",
            responseType: 2, //text
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

        response = await window.__TAURI__.http.fetch("https://www.threads.net/", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": csrf_cookie.split(";")[0].split("=")[1],
                "Cookie": csrf_cookie + sessionid + "ds_user_id=" + userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
            },
            method: "GET",
            responseType: 2, //text
        });

        const fb_dtsg = response.data.split('"DTSGInitialData",[],{"token":"')[1].split('"')[0];

        response = await window.__TAURI__.http.fetch("https://www.threads.net/api/graphql", {
            headers: {
                "Host": "www.threads.net",
                "X-CSRFToken": csrf_cookie.split(";")[0].split("=")[1],
                "Cookie": csrf_cookie + sessionid + "ds_user_id=" + userId + ";",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Sec-Fetch-Site": "same-origin",
                "X-IG-App-ID": "238260118697367",
                "X-FB-Friendly-Name": "BarcelonaProfilePageQuery",
            },
            method: "POST",
            body: window.__TAURI__.http.Body.form(Object.entries({
                fb_dtsg: fb_dtsg,
                fb_api_req_friendly_name: "BarcelonaProfilePageQuery",
                variables: JSON.stringify({
                    userID: userId,
                    __relay_internal__pv__BarcelonaIsSuggestedUsersOnProfileEnabledrelayprovider: false,
                    __relay_internal__pv__BarcelonaShouldShowFediverseM075Featuresrelayprovider: false
                }),
                doc_id: "7575854519093637"
            }).reduce((formData, [key, value]) => {
                formData.append(key, value);
                return formData;
            }, new FormData()))
        });

        if (response.status != 200) {
            return Result.err(response.data?.message ?? JSON.stringify(response.data));
        }

        return Result.ok(new SocialMediaAccount(
            new Threads({
                csrftoken: csrf_cookie,
                sessionid: sessionid
            }, userId, fb_dtsg),
            response.data?.data?.user?.full_name ?? response.data?.data?.user?.username ?? username,
            username,
            corsify(response.data?.data?.user?.profile_pic_url_hd ?? response.data?.data?.user?.profile_pic_url)
        ));
    }
}