module.exports = {
    host:"www.to8to.com",
    charset:"utf8",
    footer:$=>$(".footer_bottom").length,
    title:$=>$("h1.title3").text().trim(),
    description:$=>$("p#bc_direction").text().trim(),
    answers:$=>$('.ask_answer_li').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find("p").eq(0).text().trim(),
            accept:$(v).find("b").eq(1).text().trim() / $(v).find("b").eq(0).text().trim()
        }
    }).toArray()
}