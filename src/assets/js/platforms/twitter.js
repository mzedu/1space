
class Twitter extends SocialMedia {
    static AUTH_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

    //required cookies: ct0, auth_token and att
    constructor(cookies) {
        super("Twitter", "assets/x.webp", ["home", "chat", "notifications"]);
        this.cookies = cookies;
    }

    static async #apiRequest(url, headers_, body, method="POST") {
        let headers = headers_;
        headers["authorization"] = "Bearer " + Twitter.AUTH_BEARER;
        headers["Origin"] = "https://twitter.com";
        headers["x-twitter-active-user"] = "yes";

        return await window.__TAURI__.http.fetch(url, {
            headers: headers,
            method: method,
            body: window.__TAURI__.http.Body.json(body)
        })
    }

    async updateDetails(_account) {
        let response = await Twitter.#apiRequest("https://api.twitter.com/1.1/guest/activate.json?flow_name=guest",
            {},
            {
                input_flow_data: {
                    flow_context: {
                        debug_overrides: {},
                        start_location: {location: "splash_screen"}
                    }
                }, subtask_versions: {}
            });

        response = (await Twitter.#apiRequest("https://api.twitter.com/graphql/W62NnYgkgziw9bwyoVht0g/Viewer",
        {
            "x-guest-token": response.data.guest_token,
            "x-twitter-active-user": "yes",
            "x-csrf-token": this.cookies.ct0.split("ct0=")[1].split(";")[0],
            "Cookie": this.cookies.att + this.cookies.ct0 + this.cookies.auth_token,
        },
        {
            fieldToggles: {
                isDelegate: false,
                withAuxiliaryUserLabels: false
            },
            features: {
                responsive_web_graphql_exclude_directive_enabled: true,
                verified_phone_label_enabled: false,
                creator_subscriptions_tweet_preview_api_enabled: true,
                responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                responsive_web_graphql_timeline_navigation_enabled: true
            },
            variables: {
                withCommunitiesMemberships: true
            }
        }, "GET"));

        if (response.status !== 200) {
            return Result.err("Cannot get account data: " + JSON.stringify(response.data));
        }

        const user = response.data.data.viewer.user_results.result.legacy;

        return Result.ok(
            new SocialMediaAccount(
                this,
                user.screen_name,
                user.name,
                user.profile_image_url_https.replace("_normal", "")
                )
            );
    }

    async getFeed(cursor) {
        if (this.cookies.ct0 == null || this.cookies.auth_token == null) {
            return Result.err("No cookies specified");
        }

        let resp = await Twitter.#apiRequest("https://twitter.com/i/api/graphql/obcIlvgPiBoUryqBCkvKsw/HomeTimeline", {
            "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
            "Cookie": this.cookies.ct0 + this.cookies.auth_token,
            "x-twitter-auth-type": "OAuth2Session",
        }, {
            queryId: "obcIlvgPiBoUryqBCkvKsw",
            features: {
                responsive_web_graphql_exclude_directive_enabled: true,
                verified_phone_label_enabled: false,
                creator_subscriptions_tweet_preview_api_enabled: true,
                responsive_web_graphql_timeline_navigation_enabled: true,
                responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                c9s_tweet_anatomy_moderator_badge_enabled: true,
                tweetypie_unmention_optimization_enabled: true,
                responsive_web_edit_tweet_api_enabled: true,
                graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
                view_counts_everywhere_api_enabled: true,
                longform_notetweets_consumption_enabled: true,
                responsive_web_twitter_article_tweet_consumption_enabled: true,
                tweet_awards_web_tipping_enabled: false,
                freedom_of_speech_not_reach_fetch_enabled: true,
                standardized_nudges_misinfo: true,
                tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
                rweb_video_timestamps_enabled: true,
                longform_notetweets_rich_text_read_enabled: true,
                longform_notetweets_inline_media_enabled: true,
                responsive_web_media_download_video_enabled: false,
                responsive_web_enhance_cards_enabled: false
            },
            variables: {
                count: 20,
                includePromotedContent: true,
                latestControlAvailable: true,
                withCommunity: true,
                cursor: cursor
            }
        });

        if (resp.status != 200) {
            return Result.err("Unable to get twitter timeline: " + resp.data.toString());
        }

        let entries = resp.data?.
            ["data"]?.
            ["home"]?.
            ["home_timeline_urt"]?.
            ["instructions"]?.
            find(x => x.type === "TimelineAddEntries")?.
            ["entries"];

        return Result.ok({
            posts: entries
                .filter(x => x.entryId.startsWith("tweet") && x.content.__typename === "TimelineTimelineItem")
                .map(x => x.content.itemContent.tweet_results.result)
                .filter(x => x.__typename === "Tweet")
                .filter(x => !x.legacy.is_quote_status )
                .map(x => {
                    return new GenericPost(
                        new SocialMediaAccount(
                            this,
                            x.core.user_results.result.legacy.name,
                            x.core.user_results.result.legacy.screen_name,
                            x.core.user_results.result.legacy.profile_image_url_https.replace("_normal", "")
                        ),
                        x.legacy.full_text,
                        x.legacy.entities.media?.map(x => { 
                                return new Media(x.media_url_https, x.type, x.video_info?.variants);
                            }),
                        [
                            new Stat(this, "favorite", x.legacy.favorite_count, x.legacy.favorited, x.legacy.id_str, true),
                            new Stat(this, "cycle", x.legacy.quote_count + x.legacy.retweet_count, x.legacy.retweeted, x.legacy.id_str, true),
                            new Stat(this, "comment", x.legacy.reply_count, false, x.legacy.id_str, false),
                        ],
                        Date.parse(x.legacy.created_at)
                    );
                }),
            cursor: entries.find(x => x.entryId.startsWith("cursor-bottom"))?.content?.value
        });
    }

    async getUnreadNotificationCount() {
        const notifications_response = await Twitter.#apiRequest("https://twitter.com/i/api/2/badge_count/badge_count.json?supports_ntab_urt=1", {
            "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
            "Cookie": this.cookies.ct0 + this.cookies.auth_token,
        }, {}, "GET");

        if (notifications_response.status != 200) {
            console.error("Cannot get notification count: " + notifications_response.data.toString());
            return 0;
        }

        return notifications_response?.data?.ntab_unread_count ?? 0;
    }

    async getNotifications() {
        const notifications_response = await Twitter.#apiRequest("https://twitter.com/i/api/2/notifications/all.json", {
            "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
            "Cookie": this.cookies.ct0 + this.cookies.auth_token,
        }, {
            count: "40"
        }, "GET");

        if (notifications_response.status != 200) {
            return Result.err("Cannot get notifications: " + notifications_response.data.toString());
        }

        return Result.ok(
            Object.values(notifications_response?.data?.globalObjects?.notifications ?? {})
                .map(x => new GenericNotification(
                        x.message.text,
                        this
                    )
                )
            );
    }

    async markNotificationsAsRead() {
        const response = await Twitter.#apiRequest("https://twitter.com/i/api/2/notifications/all.json?requestContext=launch", {
            "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
            "Cookie": this.cookies.ct0 + this.cookies.auth_token,
        }, {}, "GET");

        const cursor =  response.data?.timeline?.instructions?.
            find(x => x["addEntries"] != null)?.addEntries?.entries?.
            find(x => x.entryId.startsWith("cursor-top"))?.
            content?.operation?.cursor?.value;
        
        let form = new FormData();
        form.append("cursor", cursor); 

        await window.__TAURI__.http.fetch("https://twitter.com/i/api/2/notifications/all/last_seen_cursor.json", {
            headers: {
                "authorization": "Bearer " + Twitter.AUTH_BEARER,
                "Origin": "https://twitter.com",
                "x-twitter-active-user": "yes",
                "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
                "Cookie": this.cookies.ct0 + this.cookies.auth_token,
                "x-twitter-auth-type": "OAuth2Session",
                "content-type": "application/x-www-form-urlencoded",
            },
            body: window.__TAURI__.http.Body.form(form),
            method: "POST"
        });
    }

    async activate(icon_name, identifier) {
        const url = icon_name == "favorite" ?
            "https://twitter.com/i/api/graphql/lI07N6Otwv1PhnEgXILM7A/FavoriteTweet"
            : "https://twitter.com/i/api/graphql/ojPdsZsimiJrUGLR1sjUtA/CreateRetweet";
        const query_id = url.split("graphql/")[1].split("/")[0];

        await Twitter.#apiRequest(url,
            {
                "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
                "Cookie": this.cookies.ct0 + this.cookies.auth_token,
                "x-twitter-auth-type": "OAuth2Session",
            },
            {
                queryId: query_id,
                variables: {
                    tweet_id: identifier
                }
            });
    }

    async deactivate(icon_name, identifier) {
        if (icon_name == "favorite") {
            await Twitter.#apiRequest("https://twitter.com/i/api/graphql/ZYKSe-w7KEslx3JhSIk5LA/UnfavoriteTweet", {
                    "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
                    "Cookie": this.cookies.ct0 + this.cookies.auth_token,
                    "x-twitter-auth-type": "OAuth2Session"
                },
                {
                    queryId: "ZYKSe-w7KEslx3JhSIk5LA",
                    variables: {
                        tweet_id: identifier
                    }
                });
        } else {
            await Twitter.#apiRequest("https://twitter.com/i/api/graphql/iQtK4dl5hBmXewYZuEOKVw/DeleteRetweet", {
                    "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
                    "Cookie": this.cookies.ct0 + this.cookies.auth_token,
                    "x-twitter-auth-type": "OAuth2Session"
                },
                {
                        queryId: "iQtK4dl5hBmXewYZuEOKVw",
                        variables: {
                            source_tweet_id: identifier
                        }
                });
        }
    }

    async createPost(text) {
        if (text.length > Twitter.maxPostLength()) {
            return;
        }

        await Twitter.#apiRequest("https://twitter.com/i/api/graphql/_BCvBRcat20zPDIAxmH5ag/CreateTweet", {
            "x-csrf-token": this.cookies.ct0.split(";")[0].split("=")[1],
            "Cookie": this.cookies.ct0 + this.cookies.auth_token,
            "x-twitter-auth-type": "OAuth2Session"
        },
        {
                queryId: "_BCvBRcat20zPDIAxmH5ag",
                features: {
                    c9s_tweet_anatomy_moderator_badge_enabled: true,
                    tweetypie_unmention_optimization_enabled: true,
                    responsive_web_edit_tweet_api_enabled: true,
                    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
                    view_counts_everywhere_api_enabled: true,
                    longform_notetweets_consumption_enabled: true,
                    responsive_web_twitter_article_tweet_consumption_enabled: true,
                    tweet_awards_web_tipping_enabled: false,
                    longform_notetweets_rich_text_read_enabled: true,
                    longform_notetweets_inline_media_enabled: true,
                    rweb_video_timestamps_enabled: true,
                    responsive_web_graphql_exclude_directive_enabled: true,
                    verified_phone_label_enabled: false,
                    freedom_of_speech_not_reach_fetch_enabled: true,
                    standardized_nudges_misinfo: true,
                    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
                    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                    responsive_web_graphql_timeline_navigation_enabled: true,
                    responsive_web_enhance_cards_enabled: false
                },
                variables: {
                    dark_request: false,
                    media: {
                        media_entities: [],
                        possibly_sensitive: false,
                    },
                    semantic_annotation_ids: [],
                    tweet_text: text
                }
        });
    }

    static maxPostLength() {
        return 280;
    }

    static async login(username, email, password) {
        async function flow_step(guest_token, cookies, data) {
            return await Twitter.#apiRequest("https://api.twitter.com/1.1/onboarding/task.json",
            {
                "x-guest-token": guest_token,
                "x-twitter-active-user": "yes",
                "Cookie": cookies,
            }, data);
        }

        let response = await Twitter.#apiRequest("https://api.twitter.com/1.1/guest/activate.json?flow_name=guest",
            {},
            {
                input_flow_data: {
                    flow_context: {
                        debug_overrides: {},
                        start_location: {location: "splash_screen"}
                    }
                }, subtask_versions: {}
            });

        if (response.status !== 200) {
            return Result.err("cannot get guest_token: " + JSON.stringify(response.data));
        }

        const guest_token = response.data.guest_token;

        response = await Twitter.#apiRequest("https://api.twitter.com/1.1/onboarding/task.json?flow_name=login",
            {
                "x-guest-token": guest_token,
            },
            {
                input_flow_data: {
                    flow_context: {
                        debug_overrides: {},
                        start_location: {location: "splash_screen"}
                    }
                }, subtask_versions: {}
            });

        if (response.status !== 200) {
            return Result.err("cannot get flow_token: " + JSON.stringify(response.data));
        }

        let iframe = document.createElement("iframe");
        iframe.style["display"] = "none";

        document.body.appendChild(iframe);

        let iframe_document = iframe.contentDocument;

        let input = iframe_document.createElement("input");
        input.hidden = true;
        input.setAttribute("name", "ui_metrics");

        let script = iframe_document.createElement("script");
        let script_data =
            (await window.__TAURI__.http.fetch(
                response.data.subtasks.find(x => x.subtask_id === "LoginJsInstrumentationSubtask")?.js_instrumentation?.url,
                {
                    responseType: 2
                })
            ).data;

        script.innerHTML = script_data;

        iframe_document.body.appendChild(input);
        iframe_document.body.appendChild(script);

        async function wait_for_input_change() {
            const poll = () => new Promise(resolve => {
                const check = () => {
                    if (iframe_document.body.querySelector("input").value !== "") {
                        resolve();
                    } else {
                        setTimeout(check, 5);
                    }
                };
                check();
            });
        
            await poll();
        }

        await wait_for_input_change();

        const jsi_response = iframe_document.body.querySelector("input").value;

        iframe.remove();

        const att = response.rawHeaders["set-cookie"].find(x => x.startsWith("att=")).split(";")[0] + ";";

        response = await flow_step(guest_token, att, {
            flow_token: response.data.flow_token,
            subtask_inputs: [{
                subtask_id: "LoginJsInstrumentationSubtask",
                js_instrumentation: {
                    response: jsi_response,
                    link: "next_link"
                }
            }],
        });

        if (response.status !== 200) {
            return Result.err("failed js challenge: " + JSON.stringify(response.data));
        }

        response = await flow_step(guest_token, att,
            {
                flow_token: response.data.flow_token,
                subtask_inputs: [{
                    subtask_id: "LoginEnterUserIdentifierSSO",
                    settings_list: {
                        setting_responses: [{
                            key: "user_identifier",
                            response_data: {
                                "text_data": {
                                    "result": username,
                                }
                            }
                        }],
                        link: "next_link"
                    },
                }],
            });

        if (response.status !== 200) {
            return Result.err(Array.from(response.data.errors).map(x => x.message).join(", "));
        }

        if (Array.from(response.data.subtasks).some(x => x.subtask_id == "LoginEnterAlternateIdentifierSubtask")) {
            response = await flow_step(guest_token, att,
            {
                flow_token: response.data.flow_token,
                subtask_inputs: [{
                    subtask_id: "LoginEnterAlternateIdentifierSubtask",
                    enter_text: {
                        text: email,
                        link: "next_link"
                    }
                }]
            });

            console.log("used alternate identifier");

            if (response.status !== 200) {
                return Result.err("Invalid alternate identifier: " + JSON.stringify(response.data));
            }
        }

        response = await flow_step(guest_token, att,
            {
                flow_token: response.data.flow_token,
                subtask_inputs: [{
                    subtask_id: "LoginEnterPassword",
                    enter_password: {
                        password: password, 
                        link: "next_link"
                    }
                }]
            });

        if (response.status !== 200) {
            return Result.err(Array.from(response.data.errors).map(x => x.message).join(", "));
        }

        response = await flow_step(guest_token, att,
            {
                flow_token: response.data.flow_token,
                subtask_inputs: [{
                    subtask_id: "AccountDuplicationCheck",
                    check_logged_in_account: {
                        link: "AccountDuplicationCheck_false"
                    }
                }]
            });

        if (response.status !== 200) {
            return Result.err("Account duplication check failed: " + JSON.stringify(response.data));
        }
        
        let ct0 = Array.from(response.rawHeaders["set-cookie"]).find(x => x.startsWith("ct0")).split(";")[0] + ";";
        const auth_token = Array.from(response.rawHeaders["set-cookie"]).find(x => x.startsWith("auth_token")).split(";")[0] + ";";
        
        response = (await Twitter.#apiRequest("https://api.twitter.com/graphql/W62NnYgkgziw9bwyoVht0g/Viewer",
            {
                "x-guest-token": guest_token,
                "x-twitter-active-user": "yes",
                "x-csrf-token": ct0.split("ct0=")[1].split(";")[0],
                "Cookie": att + ct0 + auth_token,
            },
            {
                fieldToggles: {
                    isDelegate: false,
                    withAuxiliaryUserLabels: false
                },
                features: {
                    responsive_web_graphql_exclude_directive_enabled: true,
                    verified_phone_label_enabled: false,
                    creator_subscriptions_tweet_preview_api_enabled: true,
                    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                    responsive_web_graphql_timeline_navigation_enabled: true
                },
                variables: {
                    withCommunitiesMemberships: true
                }
            }, "GET"));

        if (response.status !== 200) {
            return Result.err("Cannot get account data: " + JSON.stringify(response.data));
        }

        const user = response.data.data.viewer.user_results.result.legacy;

        ct0 = Array.from(response.rawHeaders["set-cookie"]).find(x => x.startsWith("ct0")).split(";")[0] + ";";
        return Result.ok(
            new SocialMediaAccount(
                    new Twitter({ct0: ct0, auth_token: auth_token, att: att}),
                    user.name,
                    user.screen_name,
                    user.profile_image_url_https.replace("_normal", "")
                )
            );
    }
}