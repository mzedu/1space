class Result {
    #is_ok = false;
    #value = null;

    constructor() {}

    static ok(value) {
        let r = new Result();
        r.#value = value;
        r.#is_ok = true;
        return r;
    }

    static err(value) {
        let r = new Result();
        r.#value = value;
        r.#is_ok = false;
        return r;
    }

    is_ok() {
        return this.#is_ok;
    }

    is_err() {
        return !this.#is_ok;
    }

    value() {
        return this.#value;
    }

    ok_or(alternative) {
        return this.is_ok() ? this.value() : alternative;
    }

    err_or(alternative) {
        return this.is_err() ? this.value() : alternative;
    }
}

function corsify(url) {
    return OneSpaceLib.osType().toLowerCase() === "linux" ? url.replace("https://", "cors://") : url.replace("https://", "https://nocors.");
}