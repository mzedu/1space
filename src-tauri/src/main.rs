// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        //hack to bypass cors
        //i don't even care anymore, i just want to get this over with
        .register_uri_scheme_protocol("nocors", |_app, req| {
            let target_url = req.uri().replace("nocors://", "https://");
            let target_url_parsed = url::Url::parse(&target_url)?;

            //this is only used for GETting media such as images or videos
            //so there's no need to add support for other request methods
            let resp = ureq::get(&target_url)
                .set("Origin", &target_url_parsed.origin().ascii_serialization())
                .call()?;

            let mut bytes = Vec::new();
            resp.into_reader().read_to_end(&mut bytes)?;
            tauri::http::ResponseBuilder::new().body(
                bytes
            )
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
