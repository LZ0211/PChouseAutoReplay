module.exports = {
    host:"home.fang.com",
    charset:"gbk",
    footer:$=>$(".verdana").length,
    title:$=>$(".info_cont > h2").text().trim(),
    description:$=>$(".info_cont p").text().trim(),
    answers:$=>$('#cmtmd').find('ul').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find("p").eq(0).text().trim(),
            accept:0,
        }
    }).toArray()
}