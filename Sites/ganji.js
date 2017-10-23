module.exports = {
    host:"zhuangxiu.ganji.com",
    charset:"utf8",
    footer:$=>$("#footer").length,
    title:$=>$(".ask-t > h1").text().trim(),
    description:$=>$(".ask-txt").text().trim(),
    answers:$=>$('.answer > ul').find('li').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find(".answer-words").text().trim(),
            accept:0,
        }
    }).toArray()
}