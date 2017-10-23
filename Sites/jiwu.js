module.exports = {
    host:"www.jiwu.com",
    charset:"utf8",
    footer:$=>$("#common-footer").length,
    title:$=>$("p.ques").text().trim(),
    description:$=>"",
    answers:$=>$('#replylist').find('li').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find("p.txt.mt10").eq(0).text().trim(),
            accept:0,
        }
    }).toArray()
}