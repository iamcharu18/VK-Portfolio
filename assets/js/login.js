// Login Form

let usernameEl = document.getElementById("username");
let passwordEl = document.getElementById("password");
let errMsgEl = document.getElementById("form-alert-span");

let loginform = document.getElementById("login-form");

let formData = {
    username: "",
    password: ""
};

usernameEl.addEventListener("change", function (event) {
    formData.username = event.target.value;
});

passwordEl.addEventListener("change", function (event) {
    formData.password = event.target.value;
});

async function submitFormData(formData) {
    let options = {
        method: "POST",
        body: JSON.stringify({ username: formData.username, password: formData.password }),
        headers: { "Content-Type": "application/json" }
    };

    let url = "/admin/login";
    // console.log(url);
    console.log(options.body);
    await fetch(url, options)
        .then(function (response) {
            return [response.status, response.text()];
        })
        .then(function (textData) {
            if (textData[0] === 401) {
                errMsgEl.textContent = "Invalid Username or password";
            }
            if (textData[0] === 200) {
                console.log('success');
                window.location.href = '/admin/dashboard';
            }
        });
}

loginform.addEventListener("submit", function (event) {
    console.log(1);
    event.preventDefault();
    submitFormData(formData);
});