let g_loading = false;
let g_cursors = {};

async function updateFeed() {
    if (g_loading) return;
    g_loading = true;

    try {
        for (let account of OneSpaceLib.getProfile().accounts) {
            if (Array.from(account.social_media.features).includes("home") && account.valid) {
                const feed = await account.social_media.getFeed(g_cursors[account.social_media.name]?.[account.identifier]);

                if (feed != null && feed.is_ok()) {
                    OneSpaceLib.loadPosts(feed.value().posts);
                    if (g_cursors[account.social_media.name] == null) g_cursors[account.social_media.name] = {};
                    g_cursors[account.social_media.name][account.identifier] = feed.value().cursor
                } else {
                    throw feed?.value() ?? "unknown error";
                }
            }
        }
    } catch (e) {
        document.getElementById("content-loader").style["display"] = "none";
        document.getElementById("error-container").style["display"] = "flex";
        document.getElementById("error-text").innerText = DOMPurify.sanitize(e.toString());
        console.error(`Unable to get home feed: ${e.toString()}`, e.stack);
        Array.from(document.getElementsByClassName("post")).forEach(x => x.remove());
    }

    g_loading = false;
}

function retryLoad() {
    document.getElementById("error-container").style["display"] = "none";
    document.getElementById("content-loader").style["display"] = "inline-block";

    Array.from(document.getElementsByClassName("post")).forEach(x => x.remove());

    updateFeed().then();
}

async function sendPost() {
    const text = document.getElementById("pc-text").value;
    let allowed_social_media = [];

    if (!document.getElementById("send-twitter").disabled && document.getElementById("send-twitter").checked) {
        allowed_social_media.push("twitter");
    }

    if (!document.getElementById("send-threads").disabled && document.getElementById("send-threads").checked) {
        allowed_social_media.push("threads");
    }

    console.log(allowed_social_media)

    if (allowed_social_media.length > 0) {
        await Promise.all(OneSpaceLib
            .getProfile()
            .validAccounts()
            .filter(x => {console.log(x.social_media); return allowed_social_media.includes(x.social_media.name.toLowerCase())})
            .map(x => x.social_media.createPost(text))
            );
    
        document.getElementById("pc-text").value = "";
    }
}

function updateCheckboxes() {
    const text_length = document.getElementById("pc-text").value.length;

    let twitter_cb = document.getElementById("send-twitter");
    if (text_length > Twitter.maxPostLength()) {
        twitter_cb.disabled = true;
        twitter_cb.checked = false;
        twitter_cb.title = `Over ${Twitter.maxPostLength()} character limit`;
    } else {
        twitter_cb.disabled = false;
        twitter_cb.title = "";
    }

    let threads_cb = document.getElementById("send-threads");
    if (text_length > Threads.maxPostLength()) {
        threads_cb.disabled = true;
        threads_cb.checked = false;
        threads_cb.title = `Over ${Threads.maxPostLength()} character limit`;
    } else {
        threads_cb.disabled = false;
        threads_cb.title = "";
    }
}

window.addEventListener("load", () => {
    new IntersectionObserver((entries, _self) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                updateFeed().then();
            }
        })
    }, {
        rootMargin: '50px',
        threshold: [.2, .9]
    }).observe(document.getElementById("content-loader"));

    document.getElementById("pc-pfp").src = OneSpaceLib.getProfile().main_account.pfp_url;
});

//tauri ignores the disable attribute so i have to do this, very unfortunate
document.addEventListener("mousemove", function () {
    updateCheckboxes();
})