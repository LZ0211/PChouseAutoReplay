module.exports = {
    host:"wenwen.sogou.com",
    charset:"utf8",
    footer:$=>$(".footer").length,
    title:$=>$("h3.questionTitle").text().trim(),
    description:$=>"",
    answers:$=>$('.answer-wrap').find('.default-answer').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find(".answer-con").text().trim(),
            accept:$(v).find("em.numarea").eq(0).text().trim()
        }
    }).toArray()
}