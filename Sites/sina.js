module.exports = {
    host:"iask.sina.com.cn",
    charset:"utf8",
    footer:$=>$(".footer").length,
    title:$=>$('.question_text').text().trim(),
    description:$=>'',
    answers:$=>$('.answer_text').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find("pre").eq(-1).text().trim(),
            accept:1
        }
    }).toArray()
}