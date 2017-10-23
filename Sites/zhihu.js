module.exports = {
    host:"www.zhihu.com",
    charset:"utf8",
    footer:$=>true,
    title:$=>$("h1.QuestionHeader-title").text().trim(),
    description:$=>{
        var source = $('#data').attr('data-state')
            .replace(/&quot;/g,'"')
            .replace(/&lt;/g,'<')
            .replace(/&gt;/g,'>')
            .replace(/<[^<>]*?>/g,'')
        var json = JSON.parse(source);
        var questions = json.entities.questions;
        return questions[Object.keys(questions)[0]].excerpt
    },
    answers:$=>{
        var source = $('#data').attr('data-state')
            .replace(/&quot;/g,'"')
            .replace(/&lt;/g,'<')
            .replace(/&gt;/g,'>')
            .replace(/<[^<>]*?>/g,'')
        var json = JSON.parse(source);
        var answers = json.entities.answers;
        return Object.keys(answers).map(k=>answers[k]).map(item=>({text:'来自知乎：'+item.excerpt,accept:item.voteupCount}))
    }
}