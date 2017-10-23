module.exports = {
    host:"ask.17house.com",
    charset:"utf8",
    footer:$=>$(".footer").length,
    title:$=>$(".title h1").text().trim(),
    description:$=>$(".content").text().trim(),
    answers:$=>{
        var $best = $('.index_center_huida');
        var answers = $('.index_center_all ul.list').find('li.clear > .right').map((i,v)=>{
            return {
                text:$(v).find('.top p').map((i,v)=>$(v).text().trim()).toArray().join('\n'),
                accept:Number($(v).find('.bottom .button_agree').val())
            }
        }).toArray();
        if($best.length){
            answers.unshift({
                text:$best.find('p').map((i,v)=>$(v).text().trim()).toArray().join('\n'),
                accept:5
            })
        }
        return answers;
    }
}