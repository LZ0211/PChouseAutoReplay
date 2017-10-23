module.exports = {
    host:"ask.jia.com",
    charset:"utf8",
    footer:$=>$(".jia_foot_info").length,
    title:$=>$(".timu_text > h1").text().trim(),
    description:$=>$(".timu_buchong").text().trim(),
    answers:$=>$('.askcon_duce').find('.duce_con,duce_con_ycn').map((i,v)=>{
        var dom = $(v);
        return {
            text:$(v).find("p.con_text.con_text2").eq(0).text().trim(),
            accept:Number($(v).find(".ducecon_zan").find("span").text().trim()),
        }
    }).toArray()
}