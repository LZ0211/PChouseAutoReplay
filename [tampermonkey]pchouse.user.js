// ==UserScript==
// @name         太平洋家居
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://caiji.pchouse.com.cn/admin/*
// @include      http://caiji.pchouse.com.cn/admin/*
// @grant        none
// ==/UserScript==

(function() {

function SearchUnprocessedQuestions(){
    var $searchButton = $('button:contains("查询")');
    var $resetButton = $('button:contains("重置")');
    var $ProcessStats = $("select[name=processStatus]");
    var $QuestionStats = $("select[name=status]");
    $ProcessStats.find("option").attr("selected",false);
    $QuestionStats.find("option").attr("selected",false);
    $ProcessStats.find('option:contains("待解决")').attr("selected",true);
    $QuestionStats.find('option:contains("草稿")').attr("selected",true);
    $searchButton.click();
}

function getQuestionList(){
    return $(".gridTbody").find("a[target=navTab]").filter(function (i,v){
        return $(v).attr("title") !== "修改问题";
    }).filter(function (i,v){
        return $(v).attr("title") !== "问题标题";
    });
}

function nextPage(){
    $("a.list-question[title=问题管理]").click();
    $('a:contains("下一页")').click();
}

function lastPage(){
    $("a.list-question[title=问题管理]").click();
    $('a:contains("上一页")').click();
}

function jumpTo(index){
    $("li.jumpto").find("input.textInput").val(index);
    $("li.jumpto").find("input.goto").click();
}

function closeQuestion(){
    $("li[tabid=update-question]").find("a.close").click();
}

function saveQuestion(){
    $("button:contains('保存')").click();
}

function setQuestionTitle(text){
    $("textarea[name=title]").val(text);
}

function formatAnswers(){
    $("#ans-table").find("textarea.textInput").each((index,value)=>{
       $(value).val(format($(value).val()));
    });
}

function getQuestionDetails(){

    function getQuestionTitle(){
        return $("textarea[name=title]").val();
    }

    function getSource(){
        return $("input[name=url]").val();
    }

    function getAnswerList(){
        return $("#answerTab").find("tr.unitBox").map(function (index,value){
            return $(value).find("td").eq(1).text();
        }).toArray();
    }

    function getAnswerSelected(){
        return $("#ans-table").find("textarea.textInput").map(function (index,value){
            return {text:$(value).val()};
        }).toArray();
    }

    function getAnswerRecommend(){
        return $("#ans-table").find("input:checked").parents("tr.unitBox").find("textarea.textInput").val();
    }

    function getQuestionFirstType(){
        return $("select[name=firstType]").find("option:selected").text();
    }

    function getQuestionSecondType(){
        return $("select[name=secondType]").find("option:selected").text();
    }

    return {
        source:getSource(),
        title:getQuestionTitle(),
        options:getAnswerList().slice(0,15),
        selected:getAnswerSelected(),
        recommend:getAnswerRecommend()
    };
}

function clearQuestionList(){
    $("div.gridTbody").remove();
}

function isListLoaded(){
    return $("div.gridTbody").length;
}

function isQuestionLoaded(){
    return $("div.formBar").find("div.buttonActive").length;
}

function noop(){}

function timer(before,after,check){
    before = before || noop;
    after = after || noop;
    check = check || function(){return true;};
    setTimeout(()=>{
        if (check()) return after();
        setTimeout(()=>{
            before();
            timer(before,after,check);
        });
    },100);
}

function selectContent(content,author) {
    var ansTable = $("#ans-table");
    var index = $("#ans-table tr").length;
    var str = "<tr class='unitBox' id='tr" + index + "'>" 
        +"<td style='display:none'></td>"
        +"<td>系统推送</td>"
        +"<td><input type='radio' class='textInput' name='bestAnsIndex' value='" + index +"' /></td>"
        +"<td>"
        +"<input id='ans" + index + "' type='hidden' name='answer[" + index + "].isDelete' value='' />"
        +"<input type='hidden' name='answer[" + index + "].id' value='' />"
        +"<textarea  class='textInput required' name='answer[" + index + "].content' maxLength='4000' cols='125' rows='8'>" + content + "</textarea>"
        +"</td>"
        +"<td>"
        +"<input type='hidden' name='answer[" + index + "].kwAccountId' value=" + author.accountId + "/>"
        +"<input type='text' class='textInput required' readOnly='true' name='answer[" + index + "].kwAccountName' value='" + author.accountName + "' size='12'/>"
        +"<a id='a" + index + "' class='btnEdit' href='javascript:void(0);' title='随机更换用户' onclick='randomAccount(this);'><span>修改</span></a>"
        +"</td>"
        +"<td></td>"
        +"<td><a class='btnDel ' href='javascript:void(0);' onclick='delAnswer(" + index + ")'>关闭</a></td>"
        +"</tr>";
    ansTable.append(str);
}

function postResult(next){
    next = next || noop;
    var tabs = $(".tabsContent").find("#lorder").eq(1);
    var options = tabs.find("tr.unitBox");
    if (!options.length)return closeQuestion();
    var ws = new WebSocket("ws://127.0.0.1:3000");
    ws.onopen = function (){
        ws.send(JSON.stringify(getQuestionDetails()));
    };
    ws.onmessage = function (mes){
        ws.close();
        var item = JSON.parse(mes.data);
        var selected = item.selected;
        var authors = item.authors;
        if (selected.length < 2) return closeQuestion();
        selected.forEach(value=>{
            var content = value.text;
            var author = authors.shift();
            selectContent(content,author);
        });
        setQuestionTitle(item.title);
        $("input[name=oldTitle]").val("##########");
        $("input[name=bestAnsIndex]").eq(0).click();
    };
}

var pageIndex = 1;
function processQuestion(){
    function collect(){
        var $list = getQuestionList();
        var $infos = $("tr[target=questionId]");
        var length = $list.length;
        var index = 0;
        pageIndex += 1;
        console.log(pageIndex);
        (function (){
            var callee = arguments.callee;
            if (index >= length){
                closeQuestion();
                nextPage();
                clearQuestionList();
                timer(null,collect,isListLoaded);
                return;
            }
            closeQuestion();
            var data = {
                Id:$infos.eq(index).find("td").eq(2).text(),
                Site:$infos.eq(index).find("td").eq(3).text(),
                QuestionStat:$infos.eq(index).find("td").eq(10).text(),
                ProcessStat:$infos.eq(index).find("td").eq(9).text(),
            };
            $list.eq(index).click();
            index += 1;
            timer(null,function (){
                $.extend(data,getQuestionDetail());
                postResult(data,function (){
                    timer(null,callee);
                });
            },isQuestionLoaded);
        })();
    }
    SearchUnprocessedQuestions();
    clearQuestionList();

    timer(null,function (){
        closeQuestion();
        jumpTo(pageIndex);
        clearQuestionList();
        timer(null,collect,isListLoaded);
    },isListLoaded);
}

function Submit(){
    var radios = $("#ans-table").find("input:radio");
    var checked = [].some.call(radios,v=>$(v).prop("checked"));
    if (!checked) radios.eq(0).prop("checked",true);
    saveQuestion();
    $index -= 1;
}

function Auto(){
    var tabs = $(".tabsContent").find("#lorder").eq(1);
    var options = tabs.find("tr.unitBox");
    if (!options.length)return closeQuestion();
    var ws = new WebSocket("ws://127.0.0.1:3000");
    ws.onopen = function (){
        ws.send(JSON.stringify(getQuestionDetails()));
    };
    ws.onmessage = function (mes){
        ws.close();
        var item = JSON.parse(mes.data);
        var selected = item.selected;
        var authors = item.authors;
        if (selected.length < 2) return closeQuestion();
        var form = {};
        var $form = $(".pageContent").find("form");
        var url = $form.attr("action");
        $form.find(":input").each(function (i,v){
            var name = $(v).attr("name");
            var value = $(v).val();
            if (name){
                form[name] = value;
            }
        });
        form.oldTitle = "###########";
        form.title = item.title;
        form.bestAnsIndex = 0;
        selected.forEach(function (value,index){
            var author = authors[index];
            form[`answer[${index}].isDelete`] = "";
            form[`answer[${index}].id`] = "";
            form[`answer[${index}].content`] = value.text;
            form[`answer[${index}].kwAccountId`] = author.accountId;
            form[`answer[${index}].kwAccountName`] = author.accountName;
        });
        selected.forEach((value,index)=>{
            var content = value.text;
            var author = authors.shift();
            form["answer["+index+"].isDelete"] = "";
            form["answer["+index+"].id"] = "";
            form["answer["+index+"].content"] = content;
            form["answer["+index+"].kwAccountId"] = author.accountId;
            form["answer["+index+"].kwAccountName"] = author.accountName;
        });
        $.ajax({
            url:url,
            type:"POST",
            dataType:"html",
            data:form,
            headers: {
                "Content-Type":"application/x-www-form-urlencoded; charset=UTF-8"
            },
            success:function (){
                console.log("POST SUCCESS");
                console.log(form);
                closeQuestion();
            },
            error:function (e){
                console.log(e);
                closeQuestion();
            }
        });
    };
}

var $index = 0;
var $Node = $(".accordionContent").eq(0);
$("<button value='Filter'>搜索</button><span>&nbsp;&nbsp;</span>")
    .bind("click",postResult)
    .css({"font-size":16})
    .appendTo($Node);

$("<button value='Submit'>提交</button><br><br>")
    .bind("click",Submit)
    .css({"font-size":16})
    .appendTo($Node);

$("<button value='Last'>上一个</button><span>&nbsp;&nbsp;</span>")
    .bind("click",()=>{
        $index -= 1;
        if ($index == -1){
            closeQuestion();
            lastPage();
            $index = 24;
        }
        getQuestionList().eq($index).click();
    })
    .css({"font-size":16})
    .appendTo($Node);

$("<button value='Next'>下一个</button><br><br>")
    .bind("click",()=>{
        $index += 1;
        if ($index == 25){
            closeQuestion();
            nextPage();
            $index = 0;
        }
        getQuestionList().eq($index).click();
    })
    .css({"font-size":16})
    .appendTo($Node);

$("<button value='Search'>过滤</button><span>&nbsp;&nbsp;</span>")
    .bind("click",SearchUnprocessedQuestions)
    .css({"font-size":16})
    .appendTo($Node);
$("<button value='Auto'>自动</button><br><br>")
    .bind("click",Auto)
    .css({"font-size":16})
    .appendTo($Node);

})();