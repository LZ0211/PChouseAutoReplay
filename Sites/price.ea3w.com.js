module.exports = {
    host: "price.ea3w.com",
    charset: "gbk",
    footer: $=>!!$(".footer-bar").length,
    title:$=>$(".title h1").text().trim(),
    description:$=>"",
    answers:$=>[{
        text:$('.title').next('p').text(),
        accept:1
    }]
}