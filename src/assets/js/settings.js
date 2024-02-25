function refreshAccountList() {
    OneSpaceLib.updateAccounts(true).then(() => {
        const account_container = document.getElementById("account-list");
        const account_template = document.getElementById("account-template");

        Array.from(account_container.children).forEach(x => x.remove());
        let main_account_div = null;

        for (let account of OneSpaceLib.getProfile().accounts) {
            let account_div = account_template.content.cloneNode(true);

            account_div.querySelector(".account-pfp").src = account.pfp_url;
            account_div.querySelector(".account-platform-icon").src = account.social_media.icon_url;

            account_div.querySelector(".account-name").innerText = DOMPurify.sanitize(account.friendly_name);
            account_div.querySelector(".account-identifier").innerText = DOMPurify.sanitize("@" + account.identifier);

            const main_account = OneSpaceLib.getProfile().main_account;

            const actual_account_div = account_div.firstElementChild;

            if (account.social_media.name == main_account.social_media.name &&
                account.identifier == main_account.identifier) {
                account_div.querySelector(".make-main-btn").style["filter"] = "invert(1)";
                main_account_div = actual_account_div;
            }

            account_div.querySelector(".invalid-warning").style["display"] = account.valid ? "none" : "inline-block";

            account_div.querySelector(".make-main-btn").addEventListener("click", function (e) {
                if (!account.valid) return;

                //if is not main
                const main_account = OneSpaceLib.getProfile().main_account;
                if (!(account.social_media.name == main_account.social_media.name &&
                    account.identifier == main_account.identifier)) {
                    main_account_div.querySelector(".make-main-btn").style["filter"] = null;
                    actual_account_div.querySelector(".make-main-btn").style["filter"] = "invert(1)";

                    let profile = OneSpaceLib.getProfile();
                    profile.main_account = account;
                    OneSpaceLib.setProfile(profile);

                    main_account_div = actual_account_div;
                }
            });

            account_div.querySelector(".remove-btn").addEventListener("click", function (e) {
                const main_account = OneSpaceLib.getProfile().main_account;

                let profile = OneSpaceLib.getProfile();
                profile.accounts = Array.from(profile.accounts).filter(x => x.identifier != account.identifier || x.social_media.name != account.social_media.name);
                profile.main_account = (account.social_media.name == main_account.social_media.name &&
                    account.identifier == main_account.identifier) ? profile.validAccounts()[0] : profile.main_account;
                
                actual_account_div.remove();
                OneSpaceLib.setProfile(profile.main_account == null ? null : profile);

                refreshAccountList(); //cba to update the main_account again
            });

            account_container.appendChild(account_div);
        }
    });
}

function openPrompt() {
    document.getElementById("add-account-container").style["display"] = "inline-block";
}

function updateAccountPrompt() {
    Array.from(document.getElementsByClassName("platform-values")).forEach(x => x.style["display"] = "none");
    document
        .querySelector(
            `#aa-prompt > #platform-${document.getElementById("platform-select").value}`
            ).style["display"] = "inline-block";
}

function addAccountFromPrompt() {
    switch (document.getElementById("platform-select").value) {
        case "twitter":
            {
                document.getElementById("aa-error").innerText = "";
                
                const username = document.getElementById("twitter-username").value;
                const email = document.getElementById("twitter-email").value;
                const password = document.getElementById("twitter-password").value;

                if (OneSpaceLib.getProfile()
                    .accounts
                    .filter(x => x.social_media.name == "Twitter")
                    .find(x => x.identifier == username || x.friendly_name == username) != null) {
                        document.getElementById("aa-error").innerText = "User already exists";
                        document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                    return;
                }

                document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "inline-block";
                
                Twitter.login(username, email, password).then((result) => {
                    if (result.is_err()) {
                        document.getElementById("aa-error").innerText = DOMPurify.sanitize(result.value().toString());
                    } else {
                        if (OneSpaceLib.getProfile()
                            .accounts
                            .filter(x => x.social_media.name == "Twitter")
                            .find(x => x.identifier == result.value().identifier) != null) {
                                document.getElementById("aa-error").innerText = "User already exists";
                                document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                            return;
                        }
                        
                        let profile = OneSpaceLib.getProfile();
                        profile.accounts.push(result.value());

                        if (profile.main_account == null) {
                            profile.main_account = result.value();
                        }

                        OneSpaceLib.setProfile(profile);
                        closePrompt();
                        refreshAccountList();
                    }

                    document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                });
                break;
            }
        case "instagram":
            {
                document.getElementById("aa-error").innerText = "";

                const username = document.getElementById("instagram-username").value;
                const password = document.getElementById("instagram-password").value;

                if (OneSpaceLib.getProfile()
                    .accounts
                    .filter(x => x.social_media.name == "Instagram")
                    .find(x => x.identifier == username) != null) {
                        document.getElementById("aa-error").innerText = "User already exists";
                        document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                    return;
                }

                document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "inline-block";
                
                Instagram.login(username, password).then((result) => {
                    if (result.is_err()) {
                        document.getElementById("aa-error").innerText = DOMPurify.sanitize(result.value().toString());
                    } else {
                        if (OneSpaceLib.getProfile()
                            .accounts
                            .filter(x => x.social_media.name == "Instagram")
                            .find(x => x.identifier == result.value().identifier) != null) {
                                document.getElementById("aa-error").innerText = "User already exists";
                                document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                            return;
                        }

                        let profile = OneSpaceLib.getProfile();
                        profile.accounts.push(result.value());

                        if (profile.main_account == null) {
                            profile.main_account = result.value();
                        }

                        OneSpaceLib.setProfile(profile);
                        closePrompt();
                        refreshAccountList();
                    }

                    document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                });

                break;
            }
        case "threads":
            {
                document.getElementById("aa-error").innerText = "";

                const username = document.getElementById("threads-username").value;
                const password = document.getElementById("threads-password").value;

                document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "inline-block";

                if (OneSpaceLib.getProfile()
                    .accounts
                    .filter(x => x.social_media.name == "Threads")
                    .find(x => x.identifier == username) != null) {
                        document.getElementById("aa-error").innerText = "User already exists";
                        document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                    return;
                }
                
                Threads.login(username, password).then((result) => {
                    if (result.is_err()) {
                        document.getElementById("aa-error").innerText = DOMPurify.sanitize(result.value().toString());
                    } else {
                        if (OneSpaceLib.getProfile()
                            .accounts
                            .filter(x => x.social_media.name == "Threads")
                            .find(x => x.identifier == result.value().identifier) != null) {
                                document.getElementById("aa-error").innerText = "User already exists";
                                document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                            return;
                        }

                        let profile = OneSpaceLib.getProfile();
                        profile.accounts.push(result.value());

                        if (profile.main_account == null) {
                            profile.main_account = result.value();
                        }

                        OneSpaceLib.setProfile(profile);
                        closePrompt();
                        refreshAccountList();
                    }

                    document.querySelector("#aa-prompt > .lds-ellipsis").style["display"] = "none";
                });

                break;
            }
        default:
            console.error("(settings.js:addAccountFromPrompt) unsupported platfrom selected");
            break;
    }
}

function closePrompt() {
    document.getElementById("add-account-container").style["display"] = "none";
}

window.addEventListener("load", refreshAccountList);