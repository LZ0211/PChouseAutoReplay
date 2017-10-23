module.exports = {
    host:"www.zx123.cn",
    charset:"utf8",
    footer:$=>$(".foot").length,
    title:$=>$(".ques_name").text().trim(),
    description:$=>$(".question_wrap div").last().text().trim(),
    answers:$=>$('.answer_item').map((i,v)=>{
        return {
            text:$(v).find(".answer_content").text().trim(),
            accept:0
        }
    }).toArray()
}