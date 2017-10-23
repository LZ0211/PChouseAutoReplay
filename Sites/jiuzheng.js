module.exports = {
    host:"www.jiuzheng.com",
    charset:"gbk",
    footer:$=>$("#footer").length,
    title:$=>$(".ask-detail h3").text().trim(),
    description:$=>$(".ask-sub-info p").text().trim().replace('补充：',''),
    answers:$=>$('.detail-item').map((i,v)=>{
        return {
            text:$(v).find(".detail-cont").text().trim(),
            accept:Number($(v).find('.favs em').text() || 0)
        }
    }).toArray()
}