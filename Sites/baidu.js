module.exports = {
    host:"zhidao.baidu.com",
    charset:"utf8",
    footer:$=>$(".footer-new").length,
    title:$=>$("span.ask-title").text().trim(),
    description:$=>$("div[accuse=qContent]").text().trim(),
    answers:$=>$('#wgt-answers').find('.line.content').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find(".con").eq(0).text().trim(),
            accept:Number($(v).find(".evaluate-num").eq(0).text().trim())
        }
    }).toArray()
}