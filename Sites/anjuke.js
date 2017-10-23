module.exports = {
    host:"www.anjuke.com",
    charset:"utf8",
    footer:$=>$(".footer").length,
    title:$=>$(".question  h1").text().trim(),
    description:$=>$(".question p").text().trim(),
    answers:$=>$('.comp-list').find('li').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find(".answer-doc").text().trim().replace(/^答：/,""),
            accept:0
        }
    }).toArray()
}