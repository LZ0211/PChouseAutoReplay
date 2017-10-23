module.exports = {
    host:"www.fang.com",
    charset:"gbk",
    footer:$=>$(".verdana").length,
    title:$=>$("h1.questionTitle").text().trim(),
    description:$=>$(".quc_add").text().trim(),
    answers:$=>$('.anscont').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find(".ansIntro").text().trim(),
            accept:Number($(v).find(".com_agree").text().trim() || 0)
        }
    }).toArray()
}