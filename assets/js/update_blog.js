var toolbarOptions = {
    container: [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block', 'image'],

        [{ 'header': 1 }, { 'header': 2 }],               // custom button values
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
        [{ 'direction': 'rtl' }],                         // text direction

        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'font': [] }],
        [{ 'align': [] }],

        ['clean']                                         // remove formatting button
    ],
    handlers: { image: quill_img_handler }
};

function quill_img_handler() {
    let fileInput = this.container.querySelector('input.ql-image[type=file]');

    if (fileInput == null) {
        fileInput = document.createElement('input');
        fileInput.setAttribute('type', 'file');
        fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
        fileInput.classList.add('ql-image');
        fileInput.addEventListener('change', async () => {
            const files = fileInput.files;
            const range = this.quill.getSelection(true);

            if (!files || !files.length) {
                console.log('No files selected');
                return;
            }

            const formData = new FormData();
            formData.append('file', files[0]);

            this.quill.enable(false);

            let options = {
                method: "POST",
                body: formData,
            };

            let url = "/admin/add-blog-image";

            // let response = await fetch(url, options);
            // let textData = await response.text();
            // console.log(response.status);
            // console.log(textData);

            await fetch(url, options).then(async response => {
                let textData = await response.text();
                this.quill.enable(true);
                this.quill.editor.insertEmbed(range.index, 'image', '/' + textData);
                this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
                fileInput.value = '';
            })
                .catch(error => {
                    console.log('quill image upload failed');
                    console.log(error);
                    this.quill.enable(true);
                });
        });
        this.container.appendChild(fileInput);
    }
    fileInput.click();
}

var quill = new Quill('#editor-container', {
    modules: {
        toolbar: toolbarOptions
    },
    placeholder: 'Compose an epic...',
    theme: 'snow'
});

let titleEl = document.getElementById("title");
let metaTitleEl = document.getElementById("metaTitle");
let urlSlugEl = document.getElementById("urlSlug");
let bannerEl = document.getElementById("banner");
let descriptionEl = document.getElementById("description");
let metaDescriptionEl = document.getElementById("metaDescription");
let metaKeywordsEl = document.getElementById("metaKeywords");
let categoryEl = document.getElementById("category");

let verifyCheckEl = document.getElementById("verifyCheck");


if (verifyCheckEl.checked != true) {
    try {
        document.getElementById("draftUpdateBtn").setAttribute('disabled', true);
        document.getElementById("submitUpdateBtn").setAttribute('disabled', true);
    }
    catch (err) {
    }
    try {
        document.getElementById("draftUpdateBtn").setAttribute('disabled', true);
        document.getElementById("submitUpdateBtn").setAttribute('disabled', true);
    }
    catch (err) {
    }

}

verifyCheckEl.addEventListener("change", function (event) {
    if (verifyCheckEl.checked != true) {
        try {
            document.getElementById("draftUpdateBtn").setAttribute('disabled', true);
            document.getElementById("submitUpdateBtn").setAttribute('disabled', true);
        }
        catch (err) {
        }
        try {
            document.getElementById("draftUpdateBtn").setAttribute('disabled', true);
            document.getElementById("submitUpdateBtn").setAttribute('disabled', true);
        }
        catch (err) {
        }
    } else {

        try {
            document.getElementById("draftUpdateBtn").removeAttribute('disabled');
            document.getElementById("submitUpdateBtn").removeAttribute('disabled');
        }
        catch (err) {
        }
        try {
            document.getElementById("draftUpdateBtn").removeAttribute('disabled');
            document.getElementById("submitUpdateBtn").removeAttribute('disabled');
        }
        catch (err) {
        }
    }
});


// Populate hidden form on submit
let contentEl = document.querySelector('input[name=content]');

quill.root.innerHTML = contentEl.value;
// console.log(contentEl.value)
// .slice(1, -1);

let formData = {
    title: titleEl.value,
    urlSlug: urlSlugEl.value,
    metaTitle: metaTitleEl.value,
    metaDescription: metaDescriptionEl.value,
    metaKeywords: metaKeywordsEl.value,
    bannerImg: "",
    description: descriptionEl.value,
    category: categoryEl.value,
    content: "",
    isDraft: 0
};

formData.bannerImg = document.getElementById("bannerPreImg").src;

titleEl.addEventListener("change", function (event) {
    formData.title = event.target.value;
});

urlSlugEl.addEventListener("change", function (event) {
    formData.urlSlug = event.target.value;
});

metaTitleEl.addEventListener("change", function (event) {
    formData.metaTitle = event.target.value;
});

metaDescriptionEl.addEventListener("change", function (event) {
    formData.metaDescription = event.target.value;
});

metaKeywordsEl.addEventListener("change", function (event) {
    formData.metaKeywords = event.target.value;
});

bannerEl.addEventListener("change", function (event) {
    formData.bannerImg = event.target.files[0];
    document.getElementById("bannerPreImg").src = URL.createObjectURL(formData.bannerImg);
});

descriptionEl.addEventListener("change", function (event) {
    formData.description = event.target.value;
});

categoryEl.addEventListener("change", function (event) {
    formData.category = event.target.value;
});

async function submitFormData(formData) {
    // console.log(3);
    let formData1 = new FormData();
    formData1.append('title', formData.title);
    formData1.append('urlSlug', formData.urlSlug);
    formData1.append('metaTitle', formData.metaTitle);
    formData1.append('metaDescription', formData.metaDescription);
    formData1.append('metaKeywords', formData.metaKeywords);
    formData1.append('bannerImg', formData.bannerImg);
    formData1.append('description', formData.description);
    formData1.append('category', formData.category);
    formData1.append('content', formData.content);
    formData1.append('isDraft', formData.isDraft);

    // for (var pair of formData1.entries()) {
    //     console.log(pair[0] + ', ' + pair[1]);
    // }

    let options = {
        method: "POST",
        body: formData1,
    };

    let blogId = document.getElementById("blogId").innerText.trim();;
    let url = "/admin/edit/" + blogId;
    console.log(url);

    await fetch(url, options)
        .then(function (response) {
            console.log(response);
            return [response.status, response.text()];
        })
        .then(function (textData) {
            console.log(textData[0])
            if (textData[0] === 401) {
                console.log("Error")
            }
            if (textData[0] === 201) {
                window.location.href = '/admin/login';
            }
            if (textData[0] === 200) {
                alert("Posted");
            }
        });
}


var form = document.querySelector('form');
form.onsubmit = function (event) {
    event.preventDefault();
    verifyCheckEl.checked = false;
    contentEl.value = quill.root.innerHTML;
    document.getElementById("draftUpdateBtn").setAttribute('disabled', true);
    document.getElementById("submitUpdateBtn").setAttribute('disabled', true);
    formData.content = contentEl.value;
    submitFormData(formData);
};

function saveDraft() {
    verifyCheckEl.checked = false;
    contentEl.value = quill.root.innerHTML;
    document.getElementById("draftUpdateBtn").setAttribute('disabled', true);
    document.getElementById("submitUpdateBtn").setAttribute('disabled', true);
    formData.content = contentEl.value;
    formData.isDraft = 1;
    submitFormData(formData);
}